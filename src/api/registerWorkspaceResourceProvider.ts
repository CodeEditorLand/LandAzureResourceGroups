/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, callWithTelemetryAndErrorHandlingSync } from "@microsoft/vscode-azext-utils";
import { WorkspaceResourceProvider } from "@microsoft/vscode-azext-utils/hostapi";
import { Disposable } from "vscode";
import { refreshWorkspace } from "../commands/workspace/refreshWorkspace";
import { ext } from "../extensionVariables";
import { CachedBranchDataProvider } from "../tree/v2/BranchDataProviderCache";
import { CompatibilityWorkspaceResourceProvider } from "./v2/compatibility/CompatibilityWorkspaceResourceProvider";
import { CompatibleWorkspaceResourceBranchDataProvider } from "./v2/compatibility/CompatibleWorkspaceResourceBranchDataProvider";
import { BranchDataProvider, WorkspaceResource } from "./v2/v2AzureResourcesApi";

export const workspaceResourceProviders: Record<string, WorkspaceResourceProvider> = {};

export function registerWorkspaceResourceProvider(resourceType: string, provider: WorkspaceResourceProvider): Disposable {
    workspaceResourceProviders[resourceType] = provider;

    return callWithTelemetryAndErrorHandlingSync('registerWorkspaceResourceProvider', () => {

        void refreshWorkspace();

        ext.v2.api.registerWorkspaceResourceProvider(new CompatibilityWorkspaceResourceProvider(resourceType, provider));
        ext.v2.api.registerWorkspaceResourceBranchDataProvider(resourceType, new CachedBranchDataProvider(new CompatibleWorkspaceResourceBranchDataProvider('azureWorkspace.loadMore') as unknown as BranchDataProvider<WorkspaceResource, AzExtTreeItem>))

        return new Disposable(() => {
            delete workspaceResourceProviders[resourceType];
            refreshWorkspace();
        });
    }) as Disposable;
}

