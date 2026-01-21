defmodule RetroTodoWeb.TaskController do
  use RetroTodoWeb, :controller

  alias RetroTodo.Tasks

  def index(conn, _params) do
    tasks = Tasks.list_tasks()
    json(conn, %{tasks: Enum.map(tasks, &task_to_json/1)})
  end

  def create(conn, %{"title" => title} = params) do
    attrs = %{
      "title" => title,
      "description" => Map.get(params, "description", ""),
      "due_date" => parse_date(Map.get(params, "due_date"))
    }

    case Tasks.create_task(attrs) do
      {:ok, task} ->
        conn
        |> put_status(:created)
        |> json(%{task: task_to_json(task)})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: format_errors(changeset)})
    end
  end

  defp task_to_json(task) do
    %{
      id: task.id,
      title: task.title,
      description: task.description,
      completed: task.completed,
      due_date: task.due_date && Date.to_iso8601(task.due_date),
      position: task.position,
      inserted_at: task.inserted_at,
      updated_at: task.updated_at
    }
  end

  defp parse_date(nil), do: nil
  defp parse_date(""), do: nil
  defp parse_date(date_string) do
    case Date.from_iso8601(date_string) do
      {:ok, date} -> date
      _ -> nil
    end
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
