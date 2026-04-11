# Travel Agency

## Запуск через Dev Container

### Требования

- [Docker](https://www.docker.com/products/docker-desktop/)
- [VS Code](https://code.visualstudio.com/) с расширением [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Шаги

1. Открой проект в VS Code
2. Нажми `Ctrl+Shift+P` (или `Cmd+Shift+P` на Mac) и выбери **"Dev Containers: Reopen in Container"**
3. Дождись сборки контейнера — зависимости установятся автоматически
4. В терминале внутри контейнера запусти сервер фронтенда:

```bash
cd frontend && npm run dev
```

5. Открой в браузере: [http://localhost:5173](http://localhost:5173)
