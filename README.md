# Stackit

## Make the CLI executable

```shell
$ chmod +x bin/cli.js

# Register the stackit command globally
$ npm install
$ npm link
```

## Build a Next application

```shell
# Interactive setup, choose TypeScript when prompted
$ stackit

# Creates a Next application named my-next-app using TypeScript
$ stackit my-next-app --ts --yes
# Creates a Next application with TypeScript and Tailwind CSS
```