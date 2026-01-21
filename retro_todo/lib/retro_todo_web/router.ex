defmodule RetroTodoWeb.Router do
  use RetroTodoWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {RetroTodoWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug RetroTodoWeb.Plugs.CORS
  end

  scope "/", RetroTodoWeb do
    pipe_through :browser

    live "/", TodoLive, :index
  end

  # API for bookmarklet sync
  scope "/api", RetroTodoWeb do
    pipe_through :api

    get "/tasks", TaskController, :index
    post "/tasks", TaskController, :create
    get "/bookmarklet.js", BookmarkletController, :show
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:retro_todo, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: RetroTodoWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
