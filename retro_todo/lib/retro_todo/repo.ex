defmodule RetroTodo.Repo do
  use Ecto.Repo,
    otp_app: :retro_todo,
    adapter: Ecto.Adapters.Postgres
end
