# Uquery

Simple query builder for PostgreSQL. Inspired by knex.

_Warning_: security against injections or attacks of any kind is not supported at this moment. Use at your own risk, and parse user input beforehand.

## Table of contents

- [Features](#features)
- [TODO](#todo)
- [FAQ](#faq)

## Features

- Full TypeScript support
- Object syntax
  - `where({ name: 'Bob' })` -> `WHERE name = 'Bob'`
  - `where({ content: null })` -> `WHERE content IS NULL`
  - `where({ created_at: new Date() })` -> `WHERE created_at > '2023-01-01T00:00:00.000Z'`
  - `where({ created_at: '> NOW()' })` -> `WHERE created_at > NOW()`
- Automatic aliasing of joined tables
  - `leftJoin('users', { id: 'posts.user.id' })` -> `LEFT JOIN users AS u ON u.id = posts.user_id`
- Extra methods
  - excludeJoin: exclude rows that join on the conditions - `excludeJoin("posts", { user_id: "users.id" })` -> `LEFT JOIN posts AS exclude_posts ON exclude_posts.user_id = users.id
WHERE exclude_posts.user_id IS NULL`

## TODO

- Prevent SQL injections
- Add date methods (whereAfter, whereBefore, etc.)
- Create and keep track of aliases for tables automatically

## FAQ

### Why?

I wanted something simple, yet intuitive, and with a better developer experience than knex. Some shortcomings I wanted to address were:

- comparing dates in object syntax
- joining other queries
- excluding rows intuitively (excludeJoin)

### You could've done it in XYZ way.

I probably didn't know. This is a learning experience for me and a work in progress, constantly evolving.

Tell me either way, I want to learn and improve! Feel free to open an issue or PR.

### Who asked these questions?

I actually made them up. I'm just trying to make this README look more interesting. But I do hope they will be asked one day.
