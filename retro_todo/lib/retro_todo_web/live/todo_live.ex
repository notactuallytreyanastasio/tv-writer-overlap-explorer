defmodule RetroTodoWeb.TodoLive do
  use RetroTodoWeb, :live_view

  alias RetroTodo.Tasks
  alias RetroTodo.Tasks.Task

  @impl true
  def mount(_params, _session, socket) do
    tasks = Tasks.list_tasks_with_links()

    {:ok,
     socket
     |> assign(:tasks, tasks)
     |> assign(:all_tasks, tasks)
     |> assign(:editing_task, nil)
     |> assign(:show_new_form, false)
     |> assign(:show_link_modal, nil)
     |> assign(:show_bookmarklet, false)
     |> assign(:new_task_form, to_form(Tasks.change_task(%Task{})))
     |> assign(:edit_task_form, nil)
     |> assign(:link_type, "related")}
  end

  @impl true
  def handle_params(_params, _uri, socket) do
    {:noreply, socket}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="mac-window">
      <div class="mac-title-bar">
        <div class="mac-close-box"></div>
        <span class="mac-title-bar-text">To Do List</span>
      </div>

      <div class="mac-toolbar">
        <button class="mac-button" phx-click="toggle_new_form">
          <%= if @show_new_form, do: "Cancel", else: "New Task" %>
        </button>
        <button class="mac-button" phx-click="toggle_bookmarklet">
          Bookmarklet
        </button>
      </div>

      <%= if @show_new_form do %>
        <div class="mac-window-content" style="border-bottom: 2px solid #000;">
          <.new_task_form form={@new_task_form} />
        </div>
      <% end %>

      <div class="mac-window-content" style="padding: 0;">
        <div class="mac-list-container">
          <%= if Enum.empty?(@tasks) do %>
            <div class="mac-empty-state">
              No tasks yet. Click "New Task" to create one.
            </div>
          <% else %>
            <%= for task <- @tasks do %>
              <.task_item
                task={task}
                editing={@editing_task && @editing_task.id == task.id}
                edit_form={@edit_task_form}
              />
            <% end %>
          <% end %>
        </div>
      </div>
    </div>

    <%= if @show_bookmarklet do %>
      <.bookmarklet_window />
    <% end %>

    <%= if @show_link_modal do %>
      <.link_modal task={@show_link_modal} all_tasks={@all_tasks} link_type={@link_type} />
    <% end %>
    """
  end

  defp new_task_form(assigns) do
    ~H"""
    <.form for={@form} phx-submit="create_task" class="space-y-3">
      <div class="mac-form-group">
        <label class="mac-label">Title:</label>
        <input
          type="text"
          name={@form[:title].name}
          value={@form[:title].value}
          class="mac-input"
          style="width: 100%;"
          placeholder="What needs to be done?"
          autofocus
        />
      </div>

      <div class="mac-form-group">
        <label class="mac-label">Description:</label>
        <textarea
          name={@form[:description].name}
          class="mac-input"
          style="width: 100%; height: 60px; resize: none;"
          placeholder="Optional details..."
        ><%= @form[:description].value %></textarea>
      </div>

      <div class="mac-form-group">
        <label class="mac-label">Due Date:</label>
        <input
          type="date"
          name={@form[:due_date].name}
          value={@form[:due_date].value}
          class="mac-date-input"
        />
      </div>

      <div class="mac-actions">
        <button type="button" class="mac-button" phx-click="toggle_new_form">Cancel</button>
        <button type="submit" class="mac-button mac-button-primary">Create</button>
      </div>
    </.form>
    """
  end

  defp task_item(assigns) do
    linked_count = length(assigns.task.outgoing_links) + length(assigns.task.incoming_links)
    assigns = assign(assigns, :linked_count, linked_count)

    ~H"""
    <div class={"mac-task-item #{if @task.completed, do: "completed", else: ""}"}>
      <%= if @editing do %>
        <.edit_task_form task={@task} form={@edit_form} />
      <% else %>
        <input
          type="checkbox"
          class="mac-checkbox"
          checked={@task.completed}
          phx-click="toggle_task"
          phx-value-id={@task.id}
        />

        <div class="mac-task-title" phx-click="start_edit" phx-value-id={@task.id} style="cursor: pointer;">
          <%= @task.title %>
        </div>

        <%= if @task.due_date do %>
          <span class={"mac-task-due-date #{if due_soon?(@task.due_date), do: "overdue"}"}>
            <%= format_date(@task.due_date) %>
          </span>
        <% end %>

        <%= if @linked_count > 0 do %>
          <span class="mac-link-badge" phx-click="show_links" phx-value-id={@task.id}>
            <%= @linked_count %> link<%= if @linked_count > 1, do: "s" %>
          </span>
        <% end %>

        <button class="mac-icon-button" phx-click="show_link_modal" phx-value-id={@task.id} title="Link">
          +
        </button>

        <button class="mac-icon-button" phx-click="delete_task" phx-value-id={@task.id} title="Delete" data-confirm="Delete this task?">
          X
        </button>
      <% end %>
    </div>
    """
  end

  defp edit_task_form(assigns) do
    ~H"""
    <.form for={@form} phx-submit="update_task" phx-value-id={@task.id} style="display: flex; gap: 8px; align-items: center; width: 100%;">
      <input
        type="text"
        name={@form[:title].name}
        value={@form[:title].value}
        class="mac-input"
        style="flex: 1;"
        autofocus
      />
      <input
        type="date"
        name={@form[:due_date].name}
        value={@form[:due_date].value}
        class="mac-date-input"
      />
      <button type="submit" class="mac-button">Save</button>
      <button type="button" class="mac-button" phx-click="cancel_edit">Cancel</button>
    </.form>
    """
  end

  defp link_modal(assigns) do
    available_tasks = Enum.filter(assigns.all_tasks, fn t ->
      t.id != assigns.task.id &&
      not Enum.any?(assigns.task.outgoing_links, fn l -> l.target_task_id == t.id end)
    end)
    assigns = assign(assigns, :available_tasks, available_tasks)

    ~H"""
    <div class="mac-modal-overlay" phx-click="close_link_modal">
      <div class="mac-modal" phx-click-away="close_link_modal">
        <div class="mac-title-bar">
          <div class="mac-close-box" phx-click="close_link_modal"></div>
          <span class="mac-title-bar-text">Link Task</span>
        </div>
        <div class="mac-window-content">
          <p style="margin-bottom: 12px;">Link "<strong><%= @task.title %></strong>" to:</p>

          <div class="mac-form-group">
            <label class="mac-label">Link Type:</label>
            <select class="mac-select" phx-change="set_link_type" name="link_type">
              <option value="related" selected={@link_type == "related"}>Related</option>
              <option value="blocks" selected={@link_type == "blocks"}>Blocks</option>
              <option value="blocked_by" selected={@link_type == "blocked_by"}>Blocked By</option>
              <option value="parent" selected={@link_type == "parent"}>Parent</option>
              <option value="child" selected={@link_type == "child"}>Child</option>
            </select>
          </div>

          <div class="mac-list-container" style="max-height: 200px;">
            <%= if Enum.empty?(@available_tasks) do %>
              <div class="mac-empty-state" style="padding: 20px;">
                No other tasks to link to.
              </div>
            <% else %>
              <%= for other_task <- @available_tasks do %>
                <div
                  class="mac-task-item"
                  style="cursor: pointer;"
                  phx-click="link_to_task"
                  phx-value-source={@task.id}
                  phx-value-target={other_task.id}
                >
                  <span class="mac-task-title"><%= other_task.title %></span>
                </div>
              <% end %>
            <% end %>
          </div>

          <%= if length(@task.outgoing_links) > 0 || length(@task.incoming_links) > 0 do %>
            <div class="mac-divider"></div>
            <p style="margin-bottom: 8px;"><strong>Current Links:</strong></p>
            <div class="mac-list-container" style="max-height: 150px;">
              <%= for link <- @task.outgoing_links do %>
                <div class="mac-task-item">
                  <span class={"mac-link-type mac-link-type-#{link.link_type}"}><%= link.link_type %></span>
                  <span class="mac-task-title"><%= find_task_title(@all_tasks, link.target_task_id) %></span>
                  <button
                    class="mac-icon-button"
                    phx-click="unlink_task"
                    phx-value-source={@task.id}
                    phx-value-target={link.target_task_id}
                    title="Remove link"
                  >
                    X
                  </button>
                </div>
              <% end %>
              <%= for link <- @task.incoming_links do %>
                <div class="mac-task-item">
                  <span class={"mac-link-type mac-link-type-#{reverse_type(link.link_type)}"}><%= reverse_type(link.link_type) %></span>
                  <span class="mac-task-title"><%= find_task_title(@all_tasks, link.source_task_id) %> (incoming)</span>
                </div>
              <% end %>
            </div>
          <% end %>

          <div class="mac-actions">
            <button class="mac-button" phx-click="close_link_modal">Done</button>
          </div>
        </div>
      </div>
    </div>
    """
  end

  defp bookmarklet_window(assigns) do
    ~H"""
    <div class="mac-modal-overlay" phx-click="toggle_bookmarklet">
      <div class="mac-modal" style="max-width: 450px;" phx-click-away="toggle_bookmarklet">
        <div class="mac-title-bar">
          <div class="mac-close-box" phx-click="toggle_bookmarklet"></div>
          <span class="mac-title-bar-text">Quick Add Bookmarklet</span>
        </div>
        <div class="mac-window-content">
          <p style="margin-bottom: 16px;">
            Drag this button to your bookmarks bar to quickly add tasks from any webpage:
          </p>

          <div style="text-align: center; margin: 20px 0;">
            <a
              href={"javascript:(function(){var s=document.createElement('script');s.src='#{RetroTodoWeb.Endpoint.url()}/api/bookmarklet.js';document.body.appendChild(s);})();"}
              class="mac-button mac-button-primary"
              style="display: inline-block; text-decoration: none; color: #000; cursor: grab;"
              draggable="true"
              onclick="alert('Drag this to your bookmarks bar!'); return false;"
            >
              + Add to Todo
            </a>
          </div>

          <div class="mac-divider"></div>

          <p style="font-size: 14px; color: #666;">
            <strong>How to use:</strong><br/>
            1. Drag the button above to your bookmarks toolbar<br/>
            2. When viewing any webpage, click the bookmark<br/>
            3. A dialog will appear with the page title pre-filled<br/>
            4. Edit and submit to add the task
          </p>

          <div class="mac-actions">
            <button class="mac-button" phx-click="toggle_bookmarklet">Close</button>
          </div>
        </div>
      </div>
    </div>
    """
  end

  # Event Handlers

  @impl true
  def handle_event("toggle_bookmarklet", _params, socket) do
    {:noreply, assign(socket, :show_bookmarklet, !socket.assigns.show_bookmarklet)}
  end

  @impl true
  def handle_event("toggle_new_form", _params, socket) do
    {:noreply, assign(socket, :show_new_form, !socket.assigns.show_new_form)}
  end

  @impl true
  def handle_event("create_task", %{"title" => title} = params, socket) do
    attrs = %{
      "title" => title,
      "description" => Map.get(params, "description", ""),
      "due_date" => parse_date(Map.get(params, "due_date", ""))
    }

    case Tasks.create_task(attrs) do
      {:ok, _task} ->
        tasks = Tasks.list_tasks_with_links()
        {:noreply,
         socket
         |> assign(:tasks, tasks)
         |> assign(:all_tasks, tasks)
         |> assign(:show_new_form, false)
         |> assign(:new_task_form, to_form(Tasks.change_task(%Task{})))
         |> put_flash(:info, "Task created!")}

      {:error, changeset} ->
        {:noreply,
         socket
         |> assign(:new_task_form, to_form(changeset))
         |> put_flash(:error, "Could not create task")}
    end
  end

  @impl true
  def handle_event("toggle_task", %{"id" => id}, socket) do
    task = Tasks.get_task!(id)

    case Tasks.toggle_task(task) do
      {:ok, _task} ->
        tasks = Tasks.list_tasks_with_links()
        {:noreply, socket |> assign(:tasks, tasks) |> assign(:all_tasks, tasks)}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Could not update task")}
    end
  end

  @impl true
  def handle_event("start_edit", %{"id" => id}, socket) do
    task = Tasks.get_task!(id)
    form = to_form(Tasks.change_task(task))
    {:noreply, socket |> assign(:editing_task, task) |> assign(:edit_task_form, form)}
  end

  @impl true
  def handle_event("cancel_edit", _params, socket) do
    {:noreply, socket |> assign(:editing_task, nil) |> assign(:edit_task_form, nil)}
  end

  @impl true
  def handle_event("update_task", %{"id" => id} = params, socket) do
    task = Tasks.get_task!(id)

    attrs = %{
      "title" => Map.get(params, "title", task.title),
      "due_date" => parse_date(Map.get(params, "due_date", ""))
    }

    case Tasks.update_task(task, attrs) do
      {:ok, _task} ->
        tasks = Tasks.list_tasks_with_links()
        {:noreply,
         socket
         |> assign(:tasks, tasks)
         |> assign(:all_tasks, tasks)
         |> assign(:editing_task, nil)
         |> assign(:edit_task_form, nil)}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Could not update task")}
    end
  end

  @impl true
  def handle_event("delete_task", %{"id" => id}, socket) do
    task = Tasks.get_task!(id)

    case Tasks.delete_task(task) do
      {:ok, _task} ->
        tasks = Tasks.list_tasks_with_links()
        {:noreply,
         socket
         |> assign(:tasks, tasks)
         |> assign(:all_tasks, tasks)
         |> put_flash(:info, "Task deleted")}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Could not delete task")}
    end
  end

  @impl true
  def handle_event("show_link_modal", %{"id" => id}, socket) do
    task = Tasks.get_task_with_links!(id)
    {:noreply, assign(socket, :show_link_modal, task)}
  end

  @impl true
  def handle_event("close_link_modal", _params, socket) do
    {:noreply, assign(socket, :show_link_modal, nil)}
  end

  @impl true
  def handle_event("set_link_type", %{"link_type" => link_type}, socket) do
    {:noreply, assign(socket, :link_type, link_type)}
  end

  @impl true
  def handle_event("link_to_task", %{"source" => source_id, "target" => target_id}, socket) do
    case Tasks.link_tasks(source_id, target_id, socket.assigns.link_type) do
      {:ok, _link} ->
        tasks = Tasks.list_tasks_with_links()
        task = Tasks.get_task_with_links!(source_id)
        {:noreply,
         socket
         |> assign(:tasks, tasks)
         |> assign(:all_tasks, tasks)
         |> assign(:show_link_modal, task)
         |> put_flash(:info, "Tasks linked!")}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Could not link tasks")}
    end
  end

  @impl true
  def handle_event("unlink_task", %{"source" => source_id, "target" => target_id}, socket) do
    Tasks.unlink_tasks(source_id, target_id)
    tasks = Tasks.list_tasks_with_links()
    task = Tasks.get_task_with_links!(source_id)
    {:noreply,
     socket
     |> assign(:tasks, tasks)
     |> assign(:all_tasks, tasks)
     |> assign(:show_link_modal, task)}
  end

  @impl true
  def handle_event("show_links", %{"id" => id}, socket) do
    task = Tasks.get_task_with_links!(id)
    {:noreply, assign(socket, :show_link_modal, task)}
  end

  # Helpers

  defp parse_date(""), do: nil
  defp parse_date(nil), do: nil
  defp parse_date(date_string) do
    case Date.from_iso8601(date_string) do
      {:ok, date} -> date
      _ -> nil
    end
  end

  defp format_date(nil), do: ""
  defp format_date(date) do
    Calendar.strftime(date, "%b %d")
  end

  defp due_soon?(date) do
    today = Date.utc_today()
    Date.compare(date, today) in [:lt, :eq] ||
      Date.diff(date, today) <= 2
  end

  defp find_task_title(tasks, task_id) do
    case Enum.find(tasks, fn t -> t.id == task_id end) do
      nil -> "Unknown"
      task -> task.title
    end
  end

  defp reverse_type("blocks"), do: "blocked_by"
  defp reverse_type("blocked_by"), do: "blocks"
  defp reverse_type("parent"), do: "child"
  defp reverse_type("child"), do: "parent"
  defp reverse_type(type), do: type
end
