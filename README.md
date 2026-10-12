# Stackit

## Make the CLI executable

```shell
$ chmod +x bin/cli.js

# Register the stackit command globally
$ npm install
$ npm link
```

## Build a Next application

```shell
# Interactive setup, choose TypeScript when prompted
$ stackit

# Creates a Next application named my-next-app using TypeScript
$ stackit my-next-app --ts --yes
# Creates a Next application with TypeScript and Tailwind CSS
$ stackit my-next-app --ts --tailwind --yes

# Creates a Next application with TypeScript and Node version 24
$ stackit my-next-app --ts --node-version 24 --yes
# Creates a Next application with TypeScript and Node version 24.18.0
$ stackit my-app --node-version 24.18.0 --yes
# Creates a Next application with TypeScript and no .nvmrc file
$ stackit my-app --no-nvmrc --yes
# Creates a Next application with TypeScript and the currently installed Node version
$ stackit my-app --node-version current --yes
```

The node flags will generate a `.nvmrc` file inside the root of the project.