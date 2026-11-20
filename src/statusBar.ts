import * as vscode from "vscode"
import type { Credential } from "./awsesh"
import { defaultStatusBarTemplate, statusBarView } from "./statusBarModel"

export class StatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
    this.item.name = "Sesh"
    this.item.command = "awsesh.switchCredentials"
  }

  update(credential: Credential | undefined, warnMinutes: number, visible: boolean, template: string = defaultStatusBarTemplate) {
    if (!visible) {
      this.item.hide()
      return
    }
    const view = statusBarView(credential, warnMinutes, Date.now(), template)
    this.item.text = view.text
    this.item.tooltip = view.tooltip
    this.item.color = view.warning ? new vscode.ThemeColor("statusBarItem.warningForeground") : undefined
    this.item.show()
  }

  dispose() {
    this.item.dispose()
  }
}
