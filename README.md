## Developer Environment Setup

I generally recommend VSCode for web development.

**Install the Bun runtime**

- https://bun.sh/

**Install npm dependencies**

```
bun install
```

**Build the project**

For continuous building as you work:

```
bun run dev
```

For one off builds:

```
bun run build
```

**Format the source code**

```
bun run format
```

## Project Structure

### ./build

This folder is produced during the build process and contains the final compiled extension files. Any modifications to this folder will be overwritten during the next build.

### ./src

This folder contains almost all of the unprocessed files that comprise the extension.

`*.ts`

- During builds, `*.ts` files are compiled and bundled using Bun.build into `*.js` files and the code within each file is wrapped inside an IIFE to avoid name clashing. Regular `*.js` files under `./src` are copied without any processing, so keep that in mind.

./src/lib

- This folder is exclusively used for typescript modules and utility scripts. This folder is ignored during the copy stage of the build process, so don't bother adding anything other than `*.ts` files here.

### ./tools

This folder contains the scripts we use to build the website. They should be fairly easy to read and modify when needed.
