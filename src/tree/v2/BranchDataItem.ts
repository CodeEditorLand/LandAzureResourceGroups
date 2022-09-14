import { AzExtTreeItem } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ApplicationResource, Box, BranchDataProvider, ResourceModelBase, ResourceQuickPickOptions } from '../../api/v2/v2AzureResourcesApi';
import { CompatibleBranchDataItem } from './CompatibleBranchDataItem';
import { ResourceGroupsItem } from './ResourceGroupsItem';
import { ResourceGroupsItemCache } from './ResourceGroupsItemCache';

export type BranchDataItemOptions = {
    defaults?: vscode.TreeItem;
};

export class BranchDataItem implements ResourceGroupsItem, Box {
    constructor(
        private readonly branchItem: ResourceModelBase,
        private readonly branchDataProvider: BranchDataProvider<ApplicationResource, ResourceModelBase>,
        private readonly itemCache: ResourceGroupsItemCache,
        private readonly options: BranchDataItemOptions | undefined) {
        itemCache.addBranchItem(this.branchItem, this);
    }

    async getChildren(): Promise<ResourceGroupsItem[] | undefined> {
        const children = await this.branchDataProvider.getChildren(this.branchItem);

        const factory = createBranchDataItemFactory(this.itemCache);

        return children?.map(child => factory(child, this.branchDataProvider));
    }

    public get resource(): ApplicationResource | undefined {
        return this.branchItem.resource;
    }

    public get quickPickOptions(): ResourceQuickPickOptions | undefined {
        return this.branchItem.quickPickOptions;
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = await this.branchDataProvider.getTreeItem(this.branchItem);

        return {
            ...this.options?.defaults ?? {},
            tooltip: 'Context value: ' + (treeItem.contextValue ?? ''),
            ...treeItem
        }
    }

    unwrap<T>(): T {
        return this.branchItem as T;
    }

    id: string;
    name: string;
    type: string;
}

export type BranchDataItemFactory = (branchItem: ResourceModelBase, branchDataProvider: BranchDataProvider<ApplicationResource, ResourceModelBase>, options?: BranchDataItemOptions) => BranchDataItem | CompatibleBranchDataItem;

export function createBranchDataItemFactory(itemCache: ResourceGroupsItemCache): BranchDataItemFactory {
    return (branchItem, branchDataProvider, options) => {
        return isAzExtTreeItem(branchItem) ? new CompatibleBranchDataItem(branchItem, branchDataProvider, itemCache, options) : new BranchDataItem(branchItem, branchDataProvider, itemCache, options);
    }
}


function isAzExtTreeItem(ti: unknown): ti is AzExtTreeItem {
    return (ti as AzExtTreeItem)._isAzExtTreeItem;
}
