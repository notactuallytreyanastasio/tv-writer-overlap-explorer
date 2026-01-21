defmodule RetroTodo.TasksFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `RetroTodo.Tasks` context.
  """

  @doc """
  Generate a task.
  """
  def task_fixture(attrs \\ %{}) do
    {:ok, task} =
      attrs
      |> Enum.into(%{
        completed: true,
        description: "some description",
        due_date: ~D[2026-01-20],
        position: 42,
        title: "some title"
      })
      |> RetroTodo.Tasks.create_task()

    task
  end
end
