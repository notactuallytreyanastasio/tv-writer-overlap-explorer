defmodule RetroTodo.Tasks.TaskLink do
  use Ecto.Schema
  import Ecto.Changeset

  alias RetroTodo.Tasks.Task

  schema "task_links" do
    belongs_to :source_task, Task
    belongs_to :target_task, Task
    field :link_type, :string, default: "related"

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(task_link, attrs) do
    task_link
    |> cast(attrs, [:source_task_id, :target_task_id, :link_type])
    |> validate_required([:source_task_id, :target_task_id])
    |> validate_inclusion(:link_type, ["related", "blocks", "blocked_by", "parent", "child"])
    |> foreign_key_constraint(:source_task_id)
    |> foreign_key_constraint(:target_task_id)
    |> unique_constraint([:source_task_id, :target_task_id])
    |> validate_different_tasks()
  end

  defp validate_different_tasks(changeset) do
    source_id = get_field(changeset, :source_task_id)
    target_id = get_field(changeset, :target_task_id)

    if source_id && target_id && source_id == target_id do
      add_error(changeset, :target_task_id, "cannot link task to itself")
    else
      changeset
    end
  end
end
