export interface BrewInstall {
  kind: "brew"
  command: string
}

export interface LinkInstall {
  kind: "link"
  url: string
}

export type InstallPlan = BrewInstall | LinkInstall

export const releasesUrl = "https://github.com/elva-labs/awsesh/releases/latest"
export const brewCommand = "brew install elva-labs/elva/awsesh"

/**
 * How to get the awsesh CLI on this host: Homebrew where it is available,
 * otherwise a link to the releases page. The extension never installs silently.
 */
export function installPlan(platform: NodeJS.Platform, hasBrew: boolean): InstallPlan {
  if ((platform === "darwin" || platform === "linux") && hasBrew) {
    return { kind: "brew", command: brewCommand }
  }
  return { kind: "link", url: releasesUrl }
}
