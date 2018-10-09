import { THEMES, COMPONENTS } from "admin/models/theme";
import { default as computed } from "ember-addons/ember-computed-decorators";

export default Ember.Component.extend({
  THEMES: THEMES,
  COMPONENTS: COMPONENTS,

  classNames: ["themes-list"],

  hasThemes: Em.computed.gt("themesList.length", 0),
  hasActiveThemes: Em.computed.gt("activeThemes.length", 0),
  hasInactiveThemes: Em.computed.gt("inactiveThemes.length", 0),

  themesTabActive: Em.computed.equal("currentTab", THEMES),
  componentsTabActive: Em.computed.equal("currentTab", COMPONENTS),

  parents: Em.computed.alias("themesList.@each.parentThemes"),

  @computed("themes", "components", "currentTab")
  themesList(themes, components) {
    if (this.get("themesTabActive")) {
      return themes;
    } else {
      return components;
    }
  },

  @computed(
    "themesList",
    "currentTab",
    "themesList.@each.user_selectable",
    "themesList.@each.default",
    "parents.length"
  )
  inactiveThemes(themes) {
    if (this.get("componentsTabActive")) {
      return themes.filter(theme => theme.get("parentThemes.length") === 0);
    }
    return themes.filter(
      theme => !theme.get("user_selectable") && !theme.get("default")
    );
  },

  @computed(
    "themesList",
    "currentTab",
    "themesList.@each.user_selectable",
    "themesList.@each.default",
    "parents.length"
  )
  activeThemes(themes) {
    if (this.get("componentsTabActive")) {
      themes = themes.filter(theme => theme.get("parentThemes.length") > 0);
    } else {
      themes = themes.filter(
        theme => theme.get("user_selectable") || theme.get("default")
      );
    }
    return _.sortBy(themes, t => {
      return [
        !t.get("default"),
        !t.get("user_selectable"),
        t.get("name").toLowerCase()
      ];
    });
  },

  didRender() {
    this._super(...arguments);

    // hide scrollbar
    const $container = this.$(".themes-list-container");
    const containerNode = $container[0];
    if (containerNode) {
      const width = containerNode.offsetWidth - containerNode.clientWidth;
      $container.css("width", `calc(100% + ${width}px)`);
    }
  },

  actions: {
    changeView(newTab) {
      if (newTab !== this.get("currentTab")) {
        this.set("currentTab", newTab);
      }
    },
    navigateToTheme(theme) {
      Em.getOwner(this)
        .lookup("router:main")
        .transitionTo("adminCustomizeThemes.show", theme);
    }
  }
});
