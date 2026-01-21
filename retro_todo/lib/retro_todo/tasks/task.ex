defmodule RetroTodo.Tasks.Task do
  use Ecto.Schema
  import Ecto.Changeset

  alias RetroTodo.Tasks.TaskLink

  schema "tasks" do
    field :title, :string
    field :description, :string
    field :completed, :boolean, default: false
    field :due_date, :date
    field :position, :integer

    has_many :outgoing_links, TaskLink, foreign_key: :source_task_id
    has_many :incoming_links, TaskLink, foreign_key: :target_task_id
    has_many :linked_tasks, through: [:outgoing_links, :target_task]

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(task, attrs) do
    task
    |> cast(attrs, [:title, :description, :completed, :due_date, :position])
    |> validate_required([:title])
    |> validate_length(:title, min: 1, max: 255)
  end
end
