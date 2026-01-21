defmodule RetroTodoWeb.PageController do
  use RetroTodoWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
