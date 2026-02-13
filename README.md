# ascol

Simplified Google Apps Script deployment management: A user-friendly clasp wrapper.

## Why ascol?

While Google Apps Script (GAS) environments are highly convenient, the deployment process can often be confusing:

* Creating a new version via the GUI often results in creating an entirely new deployment ID.
* Updating an existing deployment via `clasp` requires managing long, complex deployment IDs manually.
* Running a script as a Web App requires a specific "New Deployment" process after enabling the Web App setting.

**ascol** wraps `clasp` to provide intuitive management of your deployment environments.

## Usage Examples

### Initialize a new Apps Script project

`ascol create --title "{Project Name}"`

### Sync appsscript.json from the server

`ascol pull-config`

### Build (Transpile local JS and CSS files)

`ascol build`  
Files are copied from the `src` directory to the `dist` directory.  
`.js` and `.css` files are automatically wrapped in `<script>` or `<style>` tags and renamed to `.js.html` or `.css.html` for GAS compatibility.

### Push Resources (build & push)

`ascol push`  
`ascol push --skip-build` # Skip the build process

### Prepare Deployment Environments

* **Create a new environment for testing:**  
  `ascol deploy --new --name test --src head -d "{description}"`  
  *Note: A description (`-d`, `--description`) is required when deploying from HEAD.*

* **Create a new environment for release:**  
  `ascol deploy --new --name release --src head -d "{description}"`

### Manage Modules and Deployment Environments

* **Check currently registered local environments:**  
  `ascol list`

* **Apply the latest local resources (HEAD) to the test environment:**  
  `ascol deploy --target test --src head -d "{description}"`

* **Apply a version currently in "test" to the "release" environment:**  
  `ascol deploy --target release --src test`

* **Check past versions or remote deployment status:**  
  `ascol list --remote`

* **Restore a specific version to the test environment:**  
  `ascol deploy --target test -v 10`

* **Register an existing remote deployment ID to a local name:**  
  `ascol set-id --name stage --id "AKfycb..."`

## Installation

```bash
npm install ascol -g
```

Or for development:

```bash
npm install ascol
npm link
```

## Upcoming Features

* **Enhanced Remote Listing:**
  * `ascol list --remote --deployments (-d)`:  
    View remote deployment environments.
  * `ascol list --remote --versions (-d) [-r {Num}]`:  
    List remote versions with optional row limit.
* **Web App Support:**  
  Execute deployments with Web App settings enabled directly via command.
* **Deletion/Archiving:**
  * `ascol delete --name {environment_name}`
  * `ascol delete -i {deploymentId}`  
    Easily remove or archive deployment environments from the server.
