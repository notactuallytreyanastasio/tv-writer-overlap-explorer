defmodule RetroTodo.Repo.Migrations.CreateTasks do
  use Ecto.Migration

  def change do
    create table(:tasks) do
      add :title, :string, null: false
      add :description, :text
      add :completed, :boolean, default: false, null: false
      add :due_date, :date
      add :position, :integer

      timestamps(type: :utc_datetime)
    end

    create index(:tasks, [:position])
    create index(:tasks, [:due_date])
    create index(:tasks, [:completed])
  end
end
