defmodule RetroTodo.Tasks do
  @moduledoc """
  The Tasks context.
  """

  import Ecto.Query, warn: false
  alias RetroTodo.Repo

  alias RetroTodo.Tasks.Task
  alias RetroTodo.Tasks.TaskLink

  @doc """
  Returns the list of tasks ordered by position.
  """
  def list_tasks do
    Task
    |> order_by([t], [asc_nulls_last: t.position, desc: t.inserted_at])
    |> Repo.all()
  end

  @doc """
  Returns the list of tasks with their linked tasks preloaded.
  """
  def list_tasks_with_links do
    Task
    |> order_by([t], [asc_nulls_last: t.position, desc: t.inserted_at])
    |> preload([:outgoing_links, :incoming_links, linked_tasks: []])
    |> Repo.all()
  end

  @doc """
  Gets a single task.

  Raises `Ecto.NoResultsError` if the Task does not exist.
  """
  def get_task!(id), do: Repo.get!(Task, id)

  @doc """
  Gets a single task with linked tasks preloaded.
  """
  def get_task_with_links!(id) do
    Task
    |> Repo.get!(id)
    |> Repo.preload([:outgoing_links, :incoming_links, linked_tasks: []])
  end

  @doc """
  Creates a task with auto-assigned position.
  """
  def create_task(attrs) do
    attrs = maybe_assign_position(attrs)

    %Task{}
    |> Task.changeset(attrs)
    |> Repo.insert()
  end

  defp maybe_assign_position(attrs) do
    attrs = attrs |> Map.new(fn {k, v} -> {to_string(k), v} end)

    if Map.get(attrs, "position") do
      attrs
    else
      max_position =
        Task
        |> select([t], max(t.position))
        |> Repo.one() || 0

      Map.put(attrs, "position", max_position + 1)
    end
  end

  @doc """
  Updates a task.
  """
  def update_task(%Task{} = task, attrs) do
    task
    |> Task.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Toggles the completed status of a task.
  """
  def toggle_task(%Task{} = task) do
    task
    |> Task.changeset(%{completed: !task.completed})
    |> Repo.update()
  end

  @doc """
  Deletes a task.
  """
  def delete_task(%Task{} = task) do
    Repo.delete(task)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking task changes.
  """
  def change_task(%Task{} = task, attrs \\ %{}) do
    Task.changeset(task, attrs)
  end

  # Task Links

  @doc """
  Creates a link between two tasks.
  """
  def link_tasks(source_task_id, target_task_id, link_type \\ "related") do
    %TaskLink{}
    |> TaskLink.changeset(%{
      source_task_id: source_task_id,
      target_task_id: target_task_id,
      link_type: link_type
    })
    |> Repo.insert()
  end

  @doc """
  Removes a link between two tasks.
  """
  def unlink_tasks(source_task_id, target_task_id) do
    TaskLink
    |> where([l], l.source_task_id == ^source_task_id and l.target_task_id == ^target_task_id)
    |> Repo.delete_all()
  end

  @doc """
  Gets all tasks linked to a given task (both directions).
  """
  def get_linked_tasks(task_id) do
    outgoing =
      TaskLink
      |> where([l], l.source_task_id == ^task_id)
      |> preload(:target_task)
      |> Repo.all()
      |> Enum.map(fn link -> {link.target_task, link.link_type} end)

    incoming =
      TaskLink
      |> where([l], l.target_task_id == ^task_id)
      |> preload(:source_task)
      |> Repo.all()
      |> Enum.map(fn link -> {link.source_task, reverse_link_type(link.link_type)} end)

    outgoing ++ incoming
  end

  defp reverse_link_type("blocks"), do: "blocked_by"
  defp reverse_link_type("blocked_by"), do: "blocks"
  defp reverse_link_type("parent"), do: "child"
  defp reverse_link_type("child"), do: "parent"
  defp reverse_link_type(type), do: type

  @doc """
  Returns changeset for task link.
  """
  def change_task_link(%TaskLink{} = task_link, attrs \\ %{}) do
    TaskLink.changeset(task_link, attrs)
  end

  @doc """
  Reorder tasks by updating positions.
  """
  def reorder_tasks(task_ids) when is_list(task_ids) do
    Repo.transaction(fn ->
      task_ids
      |> Enum.with_index(1)
      |> Enum.each(fn {id, position} ->
        Task
        |> where([t], t.id == ^id)
        |> Repo.update_all(set: [position: position])
      end)
    end)
  end
end
