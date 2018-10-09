class AddUserSelectableToChildThemes < ActiveRecord::Migration[5.2]
  def change
    add_column :child_themes, :user_selectable, :boolean, null: false, default: false
  end
end
