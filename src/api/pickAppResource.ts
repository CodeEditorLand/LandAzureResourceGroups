/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, ITreeItemPickerContext } from "@microsoft/vscode-azext-utils";
import { PickAppResourceOptions } from "@microsoft/vscode-azext-utils/hostapi";
import { QuickPickItem } from "vscode";
import { ResourceLocation } from "../constants";
import { ext } from "../extensionVariables";
import { SubscriptionTreeItem } from "../tree/SubscriptionTreeItem";
import { WorkspaceTreeItem } from "../tree/WorkspaceTreeItem";
import { localize } from "../utils/localize";

export async function pickAppResource<T extends AzExtTreeItem>(context: ITreeItemPickerContext, options?: PickAppResourceOptions): Promise<T> {
    let resourceLocation: string;

    if (options?.expectedWorkspaceContextValue && options?.expectedChildContextValue) {
        const placeHolder = localize('pickLocalOrRemote', 'Choose between local and remote locations.');
        const locationQuickPicks: QuickPickItem[] = [{ label: ResourceLocation.Local }, { label: ResourceLocation.Remote }];
        resourceLocation = (await context.ui.showQuickPick(locationQuickPicks, { placeHolder })).label;
    } else if (options?.expectedWorkspaceContextValue) {
        resourceLocation = ResourceLocation.Local;
    } else {
        resourceLocation = ResourceLocation.Remote;
    }

    if (resourceLocation === ResourceLocation.Local) {
        return await pickLocalResource<T>(context, options);
    } else {
        return await pickRemoteResource<T>(context, options);
    }
}

async function pickRemoteResource<T extends AzExtTreeItem>(context: ITreeItemPickerContext, options?: PickAppResourceOptions): Promise<T> {
    const subscription: SubscriptionTreeItem = await ext.appResourceTree.showTreeItemPicker(SubscriptionTreeItem.contextValue, context);
    const appResource = await subscription.pickAppResource(context, options);
    if (options?.expectedChildContextValue) {
        return await ext.appResourceTree.showTreeItemPicker(options.expectedChildContextValue, context, appResource);
    } else {
        return appResource as unknown as T;
    }
}

async function pickLocalResource<T extends AzExtTreeItem>(context: ITreeItemPickerContext, options?: PickAppResourceOptions): Promise<T> {
    const workspaceResource: WorkspaceTreeItem = await ext.workspaceTree.showTreeItemPicker(options?.workspaceRootContextValue ?? WorkspaceTreeItem.contextValue, context);
    if (options?.expectedWorkspaceContextValue) {
        return await ext.workspaceTree.showTreeItemPicker(options.expectedWorkspaceContextValue, context, workspaceResource);
    } else {
        return workspaceResource as unknown as T;
    }
}
