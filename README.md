Установка этой ерунды (нужны установленные redis и bun):

```
$ git clone https://github.com/maximbo/arevord.git
$ cd arevord
$ bun install
$ bun run build
$ cp env-example .env
$ bun run migrate
```

Запускаем штуку, которая складывает результаты в БД (получает данные от parser и возвращает результаты fetcher):

```
$ bun run storer
```

Запускаем парсер (получает сырые данные от фетчера и плюётся результатами в storer):

```
$ bun run parser
```

Запускаем fetcher (бегает по url'ам и плюётся результатами в parser):

```
$ bun run fetcher
```
