import RestAdapter from "discourse/adapters/rest";

export default RestAdapter.extend({
  basePath() {
    return "/admin/";
  },

  afterFindAll(results) {
    let map = {};
    results.forEach(theme => {
      map[theme.id] = theme;
      if (theme.get("component")) {
        theme.set("parentThemes", []);
      }
    });
    results.forEach(theme => {
      const components = [];
      const mapped = theme.get("child_themes") || [];
      mapped.forEach(t => {
        const child = map[t.id];
        if (child) {
          components.push(child);
          const childParents = child.get("parentThemes");
          if (!childParents.includes(theme)) {
            child.set("parentThemes", [...childParents, theme]);
          }
        }
      });
      theme.set(
        "allComponents",
        _.sortBy(components, t => t.get("name").toLowerCase())
      );
    });
    return results;
  },

  jsonMode: true
});
