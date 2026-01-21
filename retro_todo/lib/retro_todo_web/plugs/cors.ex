defmodule RetroTodoWeb.Plugs.CORS do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    conn
    |> put_resp_header("access-control-allow-origin", "*")
    |> put_resp_header("access-control-allow-methods", "GET, POST, OPTIONS")
    |> put_resp_header("access-control-allow-headers", "content-type")
    |> handle_options()
  end

  defp handle_options(%{method: "OPTIONS"} = conn) do
    conn
    |> send_resp(204, "")
    |> halt()
  end

  defp handle_options(conn), do: conn
end
