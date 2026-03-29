function getCookie(name) {
    const prefix = `${name}=`
    return document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix))
        ?.slice(prefix.length) || null
}

function clearAccessToken() {
    document.cookie = 'access_token=; Max-Age=0; path=/'
}

function authHeaders() {
    const token = getCookie('access_token')
    if (!token) {
        return null
    }
    return { Authorization: `Bearer ${token}` }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

const loginForm = document.getElementById('loginForm')
if (loginForm) {
    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault()

        const form = event.target
        const formData = new FormData(form)
        const payload = new URLSearchParams()

        for (const [key, value] of formData.entries()) {
            payload.append(key, value)
        }

        try {
            const response = await fetch('/auth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: payload.toString()
            })

            if (response.ok) {
                const data = await response.json()
                document.cookie = `access_token=${data.access_token}; path=/`
                window.location.href = '/todos/todo-page'
            } else {
                const errorData = await response.json()
                alert(`Error: ${errorData.detail}`)
            }
        } catch (error) {
            alert('Login request failed. Please try again.')
        }
    })
}

const todoPage = document.getElementById('todoPage')
if (todoPage) {
    const todoList = document.getElementById('todoList')
    const todoForm = document.getElementById('todoForm')
    const logoutBtn = document.getElementById('logoutBtn')

    const headers = authHeaders()
    if (!headers) {
        window.location.href = '/auth/login-page'
    }

    async function loadTodos() {
        const currentHeaders = authHeaders()
        if (!currentHeaders) {
            window.location.href = '/auth/login-page'
            return
        }

        const response = await fetch('/todos/', { headers: currentHeaders })
        if (!response.ok) {
            if (response.status === 401) {
                clearAccessToken()
                window.location.href = '/auth/login-page'
                return
            }
            alert('Failed to load todos.')
            return
        }

        const todos = await response.json()
        todoList.innerHTML = ''

        if (!todos.length) {
            todoList.innerHTML = '<li class="list-group-item text-muted">No todos yet.</li>'
            return
        }

        for (const todo of todos) {
            const item = document.createElement('li')
            item.className = 'list-group-item d-flex justify-content-between align-items-center'
            const safeTitle = escapeHtml(todo.title)
            const safeDescription = escapeHtml(todo.description)
            item.innerHTML = `
                <div>
                    <strong>${safeTitle}</strong>
                    <div class="text-muted small">${safeDescription}</div>
                    <div class="small">Priority: ${todo.priority} | Completed: ${todo.complete ? 'Yes' : 'No'}</div>
                </div>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-primary" data-action="toggle" data-id="${todo.id}" data-title="${safeTitle}" data-description="${safeDescription}" data-priority="${todo.priority}" data-complete="${todo.complete}">Toggle</button>
                    <button class="btn btn-outline-secondary" data-action="edit" data-id="${todo.id}" data-title="${safeTitle}" data-description="${safeDescription}" data-priority="${todo.priority}" data-complete="${todo.complete}">Edit</button>
                    <button class="btn btn-danger" data-action="delete" data-id="${todo.id}">Delete</button>
                </div>
            `
            todoList.appendChild(item)
        }
    }

    todoForm.addEventListener('submit', async function (event) {
        event.preventDefault()
        const formData = new FormData(todoForm)
        const payload = {
            title: formData.get('title'),
            description: formData.get('description'),
            priority: Number(formData.get('priority')),
            complete: formData.get('complete') === 'on'
        }

        const currentHeaders = authHeaders()
        if (!currentHeaders) {
            window.location.href = '/auth/login-page'
            return
        }

        const response = await fetch('/todos/todo', {
            method: 'POST',
            headers: {
                ...currentHeaders,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorData = await response.json()
            alert(`Create failed: ${errorData.detail}`)
            return
        }

        todoForm.reset()
        loadTodos()
    })

    todoList.addEventListener('click', async function (event) {
        const target = event.target
        if (!(target instanceof HTMLButtonElement)) {
            return
        }
        const todoId = target.dataset.id
        if (!todoId) {
            return
        }
        const action = target.dataset.action

        const currentHeaders = authHeaders()
        if (!currentHeaders) {
            window.location.href = '/auth/login-page'
            return
        }

        if (action === 'delete') {
            const response = await fetch(`/todos/todo/${todoId}`, {
                method: 'DELETE',
                headers: currentHeaders
            })

            if (!response.ok) {
                const errorData = await response.json()
                alert(`Delete failed: ${errorData.detail}`)
                return
            }

            loadTodos()
            return
        }

        if (action === 'toggle') {
            const payload = {
                title: target.dataset.title,
                description: target.dataset.description,
                priority: Number(target.dataset.priority),
                complete: target.dataset.complete !== 'true'
            }

            const response = await fetch(`/todos/todo/${todoId}`, {
                method: 'PUT',
                headers: {
                    ...currentHeaders,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errorData = await response.json()
                alert(`Toggle failed: ${errorData.detail}`)
                return
            }

            loadTodos()
            return
        }

        if (action === 'edit') {
            const nextTitle = prompt('Update title:', target.dataset.title || '')
            if (nextTitle === null) {
                return
            }

            const nextDescription = prompt('Update description:', target.dataset.description || '')
            if (nextDescription === null) {
                return
            }

            const priorityInput = prompt('Update priority (1-5):', target.dataset.priority || '3')
            if (priorityInput === null) {
                return
            }
            const nextPriority = Number(priorityInput)

            if (nextTitle.trim().length < 3) {
                alert('Title must be at least 3 characters.')
                return
            }
            if (nextDescription.trim().length < 3 || nextDescription.trim().length > 100) {
                alert('Description must be 3-100 characters.')
                return
            }
            if (!Number.isInteger(nextPriority) || nextPriority < 1 || nextPriority > 5) {
                alert('Priority must be an integer from 1 to 5.')
                return
            }

            const payload = {
                title: nextTitle.trim(),
                description: nextDescription.trim(),
                priority: nextPriority,
                complete: target.dataset.complete === 'true'
            }

            const response = await fetch(`/todos/todo/${todoId}`, {
                method: 'PUT',
                headers: {
                    ...currentHeaders,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errorData = await response.json()
                alert(`Update failed: ${errorData.detail}`)
                return
            }

            loadTodos()
            return
        }

        alert('Unknown action.')
    })

    logoutBtn.addEventListener('click', function () {
        clearAccessToken()
        window.location.href = '/auth/login-page'
    })

    loadTodos()
}
