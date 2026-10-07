/** Where the desktop app's installer is published (a GitHub Release, built by .github/workflows/desktop-release.yml). */
const REPOSITORY = 'https://github.com/Divyanshu2805/bitbin'

export const DESKTOP_RELEASES_URL = `${REPOSITORY}/releases`

/** Always the newest release's Windows installer: the file keeps the same name in every release. */
export const DESKTOP_WINDOWS_DOWNLOAD_URL = `${REPOSITORY}/releases/latest/download/BitBin-Setup.exe`

/** How to run the app on macOS and Linux, which have no installer yet. */
export const DESKTOP_SOURCE_URL = `${REPOSITORY}/tree/main/desktop#run-it`
