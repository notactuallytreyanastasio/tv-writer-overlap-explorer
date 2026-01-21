defmodule RetroTodoWeb.BookmarkletController do
  use RetroTodoWeb, :controller

  def show(conn, _params) do
    # Get the host from the request for the API URL
    host = get_host(conn)

    bookmarklet_js = """
    (function() {
      var API_URL = '#{host}/api/tasks';

      // Create modal overlay
      var overlay = document.createElement('div');
      overlay.id = 'retro-todo-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Monaco,monospace;';

      // Create modal window
      var modal = document.createElement('div');
      modal.style.cssText = 'background:#ddd;border:2px solid #000;box-shadow:2px 2px 0 rgba(0,0,0,0.3);width:350px;';

      // Title bar
      var titleBar = document.createElement('div');
      titleBar.style.cssText = 'background:#fff;border-bottom:2px solid #000;padding:4px 8px;display:flex;align-items:center;gap:8px;';
      titleBar.innerHTML = '<div style="width:12px;height:12px;border:2px solid #000;cursor:pointer;" onclick="document.getElementById(\\'retro-todo-overlay\\').remove()"></div><span style="flex:1;text-align:center;font-weight:bold;">Quick Add Task</span>';

      // Content
      var content = document.createElement('div');
      content.style.cssText = 'padding:16px;';

      // Form
      var form = document.createElement('form');
      form.innerHTML = `
        <div style="margin-bottom:12px;">
          <label style="display:block;font-weight:bold;margin-bottom:4px;">Title:</label>
          <input type="text" id="retro-todo-title" style="width:100%;box-sizing:border-box;padding:4px 8px;border:2px solid #000;font-family:Monaco,monospace;" value="${document.title}" />
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;font-weight:bold;margin-bottom:4px;">Description:</label>
          <textarea id="retro-todo-desc" style="width:100%;box-sizing:border-box;padding:4px 8px;border:2px solid #000;font-family:Monaco,monospace;height:60px;resize:none;">${window.location.href}</textarea>
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;font-weight:bold;margin-bottom:4px;">Due Date:</label>
          <input type="date" id="retro-todo-date" style="padding:4px 8px;border:2px solid #000;font-family:Monaco,monospace;" />
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button type="button" onclick="document.getElementById('retro-todo-overlay').remove()" style="padding:4px 16px;border:2px solid #000;background:#fff;cursor:pointer;font-family:Monaco,monospace;">Cancel</button>
          <button type="submit" style="padding:4px 16px;border:3px solid #000;border-radius:4px;background:#fff;cursor:pointer;font-family:Monaco,monospace;font-weight:bold;">Add Task</button>
        </div>
      `;

      form.onsubmit = function(e) {
        e.preventDefault();
        var title = document.getElementById('retro-todo-title').value;
        var desc = document.getElementById('retro-todo-desc').value;
        var date = document.getElementById('retro-todo-date').value;

        if (!title.trim()) {
          alert('Please enter a title');
          return;
        }

        var submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Adding...';
        submitBtn.disabled = true;

        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title, description: desc, due_date: date || null })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.task) {
            overlay.innerHTML = '<div style="background:#ddd;border:2px solid #000;padding:20px;text-align:center;"><div style="font-size:24px;margin-bottom:8px;">Task Added!</div><button onclick="document.getElementById(\\'retro-todo-overlay\\').remove()" style="padding:4px 16px;border:2px solid #000;background:#fff;cursor:pointer;">OK</button></div>';
            setTimeout(function() { overlay.remove(); }, 1500);
          } else {
            throw new Error('Failed to create task');
          }
        })
        .catch(function(err) {
          alert('Error: ' + err.message);
          submitBtn.textContent = 'Add Task';
          submitBtn.disabled = false;
        });
      };

      content.appendChild(form);
      modal.appendChild(titleBar);
      modal.appendChild(content);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      document.getElementById('retro-todo-title').focus();
      document.getElementById('retro-todo-title').select();
    })();
    """

    conn
    |> put_resp_content_type("application/javascript")
    |> send_resp(200, bookmarklet_js)
  end

  defp get_host(conn) do
    scheme = if conn.scheme == :https, do: "https", else: "http"
    port_suffix = case {conn.scheme, conn.port} do
      {:http, 80} -> ""
      {:https, 443} -> ""
      {_, port} -> ":#{port}"
    end
    "#{scheme}://#{conn.host}#{port_suffix}"
  end
end
