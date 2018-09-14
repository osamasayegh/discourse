import RestAdapter from "discourse/adapters/rest";

export default RestAdapter.extend({
  basePath() {
    return "/admin/";
  },

  afterFindAll(results) {
    let map = {};
    results.forEach(theme => {
      map[theme.id] = theme;
    });
    results.forEach(theme => {
      const selectable = []
      const active = []
      const mapped = theme.get("child_themes") || [];
      mapped.forEach(t => {
        const child = map[t.id];
        if (child) {
          if (t.selectable) {
            selectable.push(child);
          } else {
            active.push(child);
          }
        }
      });
      theme.set("selectableComponents", selectable);
      theme.set("activeComponents", active);
    });
    return results;
  },

  jsonMode: true
});
