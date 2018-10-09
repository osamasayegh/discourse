import RestModel from "discourse/models/rest";
import { default as computed } from "ember-addons/ember-computed-decorators";
import { popupAjaxError } from "discourse/lib/ajax-error";

const THEME_UPLOAD_VAR = 2;

export const THEMES = "themes";
export const COMPONENTS = "components";
const SETTINGS_TYPE_ID = 5;

const Theme = RestModel.extend({
  FIELDS_IDS: [0, 1],
  isActive: Em.computed.or("default", "user_selectable"),
  isPendingUpdates: Em.computed.gt("remote_theme.commits_behind", 0),
  hasEditedFields: Em.computed.gt("editedFields.length", 0),

  initialize(component) {
    if (component) {
      this.setProperties({
        component: true,
        parentThemes: []
      });
    } else {
      this.setProperties({
        component: false,
        allComponents: []
      });
    }
  },

  @computed("theme_fields")
  themeFields(fields) {
    if (!fields) {
      this.set("theme_fields", []);
      return {};
    }

    let hash = {};
    fields.forEach(field => {
      if (!field.type_id || this.get("FIELDS_IDS").includes(field.type_id)) {
        hash[this.getKey(field)] = field;
      }
    });
    return hash;
  },

  @computed("theme_fields", "theme_fields.@each")
  uploads(fields) {
    if (!fields) {
      return [];
    }
    return fields.filter(
      f => f.target === "common" && f.type_id === THEME_UPLOAD_VAR
    );
  },

  @computed("theme_fields", "theme_fields.@each.error")
  isBroken(fields) {
    return (
      fields && fields.some(field => field.error && field.error.length > 0)
    );
  },

  @computed("theme_fields.@each")
  editedFields(fields) {
    return fields.filter(
      field => !Em.isBlank(field.value) && field.type_id !== SETTINGS_TYPE_ID
    );
  },

  @computed("remote_theme.last_error_text")
  remoteError(errorText) {
    if (errorText && errorText.length > 0) {
      return errorText;
    }
  },

  getKey(field) {
    return `${field.target} ${field.name}`;
  },

  hasEdited(target, name) {
    if (name) {
      return !Em.isEmpty(this.getField(target, name));
    } else {
      let fields = this.get("theme_fields") || [];
      return fields.any(
        field => field.target === target && !Em.isEmpty(field.value)
      );
    }
  },

  switchType(newType) {
    let updatedProps = {
      default: false,
      color_scheme_id: null,
      user_selectable: false
    };
    if (newType) {
      Object.assign(updatedProps, {
        allComponents: null,
        child_themes: null,
        parentThemes: [],
        component: true
      });
    } else {
      Object.assign(updatedProps, {
        allComponents: [],
        child_themes: [],
        parentThemes: null,
        component: false
      });
    }
    this.setProperties(updatedProps);
  },

  getError(target, name) {
    let themeFields = this.get("themeFields");
    let key = this.getKey({ target, name });
    let field = themeFields[key];
    return field ? field.error : "";
  },

  getField(target, name) {
    let themeFields = this.get("themeFields");
    let key = this.getKey({ target, name });
    let field = themeFields[key];
    return field ? field.value : "";
  },

  removeField(field) {
    this.set("changed", true);

    field.upload_id = null;
    field.value = null;

    return this.saveChanges("theme_fields");
  },

  setField(target, name, value, upload_id, type_id) {
    this.set("changed", true);
    let themeFields = this.get("themeFields");
    let field = { name, target, value, upload_id, type_id };

    // slow path for uploads and so on
    if (type_id && type_id > 1) {
      let fields = this.get("theme_fields");
      let existing = fields.find(
        f => f.target === target && f.name === name && f.type_id === type_id
      );
      if (existing) {
        existing.value = value;
        existing.upload_id = upload_id;
      } else {
        fields.push(field);
      }
      return;
    }

    // fast path
    let key = this.getKey({ target, name });
    let existingField = themeFields[key];
    if (!existingField) {
      this.theme_fields.push(field);
      themeFields[key] = field;
    } else {
      existingField.value = value;
    }
  },

  @computed("allComponents.[]", "child_themes.[]")
  activeComponents(components, raw) {
    const active = this.get("child_themes")
      .filter(c => !c.selectable)
      .map(c => c.id);
    return components.filter(component => active.includes(component.get("id")));
  },

  @computed("allComponents.[]", "child_themes.[]")
  selectableComponents(components, raw) {
    const selectable = this.get("child_themes")
      .filter(c => c.selectable)
      .map(c => c.id);
    return components.filter(component =>
      selectable.includes(component.get("id"))
    );
  },

  removeComponent(component) {
    const list = this.get("allComponents");
    list.removeObject(component);
    const child = this.get("child_themes").find(
      c => c.id === component.get("id")
    );
    this.get("child_themes").removeObject(child);
    const parents = component.get("parentThemes");
    if (parents) {
      parents.removeObject(this);
    }
  },

  addComponent(component, selectable) {
    const child = this.get("child_themes").find(
      c => c.id === component.get("id")
    );
    if (child) {
      this.get("child_themes").removeObject(child);
    }
    this.get("child_themes").pushObject({
      id: component.get("id"),
      name: component.get("name"),
      selectable
    });
    const list = this.get("allComponents");
    list.removeObject(component);
    list.pushObject(component);
    component.get("parentThemes").pushObject(this);
  },

  saveComponents(added, removed) {
    const hash = {
      removed: removed.map(c => c.id),
      added_selectable: added.filter(c => c.selectable).map(c => c.id),
      added_active: added.filter(c => !c.selectable).map(c => c.id)
    };
    return this.save({ components_changes: hash }).catch(popupAjaxError);
  },

  @computed("name", "default")
  description(name, isDefault) {
    if (isDefault) {
      return I18n.t("admin.customize.theme.default_name", { name: name });
    } else {
      return name;
    }
  },

  checkForUpdates() {
    return this.save({ remote_check: true }).then(() =>
      this.set("changed", false)
    );
  },

  updateToLatest() {
    return this.save({ remote_update: true }).then(() =>
      this.set("changed", false)
    );
  },

  changed: false,

  saveChanges() {
    const hash = this.getProperties.apply(this, arguments);
    return this.save(hash)
      .finally(() => this.set("changed", false))
      .catch(popupAjaxError);
  },

  saveSettings(name, value) {
    const settings = {};
    settings[name] = value;
    return this.save({ settings });
  }
});

export default Theme;
