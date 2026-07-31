# GitHub

## Objetivo

Este servidor utilizará exclusivamente la API oficial de GitHub.

## Método de autenticación

- GitHub App (Producción)
- Fine-grained Personal Access Token (Desarrollo)

## Funciones previstas

- Leer archivos
- Crear archivos
- Modificar archivos
- Eliminar archivos
- Buscar archivos
- Crear ramas
- Crear commits
- Crear Pull Requests
- Hacer merge
- Ejecutar GitHub Actions

## Reglas

- Nunca almacenar tokens en el repositorio.
- Utilizar variables de entorno.
- Aplicar el principio de mínimo privilegio.
- Registrar todas las operaciones realizadas.