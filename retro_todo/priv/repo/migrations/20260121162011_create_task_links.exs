defmodule RetroTodo.Repo.Migrations.CreateTaskLinks do
  use Ecto.Migration

  def change do
    create table(:task_links) do
      add :source_task_id, references(:tasks, on_delete: :delete_all), null: false
      add :target_task_id, references(:tasks, on_delete: :delete_all), null: false
      add :link_type, :string, default: "related"

      timestamps(type: :utc_datetime)
    end

    create index(:task_links, [:source_task_id])
    create index(:task_links, [:target_task_id])
    create unique_index(:task_links, [:source_task_id, :target_task_id])
  end
end
