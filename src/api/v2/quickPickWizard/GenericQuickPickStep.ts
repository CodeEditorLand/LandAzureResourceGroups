/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IAzureQuickPickItem, NoResourceFoundError, parseError } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ResourceModelBase } from '../v2AzureResourcesApi';
import { ContextValueFilter, matchesContextValueFilter } from './ContextValueFilter';
import { QuickPickWizardContext } from './QuickPickWizardContext';

export class GenericQuickPickStep<TModel extends ResourceModelBase> extends AzureWizardPromptStep<QuickPickWizardContext<TModel>> {
    public supportsDuplicateSteps = true;

    public constructor(
        protected readonly treeDataProvider: vscode.TreeDataProvider<TModel>,
        protected readonly contextValueFilter: ContextValueFilter,
    ) {
        super();
    }

    public async prompt(wizardContext: QuickPickWizardContext<TModel>): Promise<void> {
        try {
            await this.promptInternal(wizardContext);
        } catch (err) {
            const error = parseError(err);
            if (error.errorType === 'GoBackError') {
                // Instead of wiping out a property value, which is the default wizard behavior for `GoBackError`, pop the most recent
                // value off from the provenance of the picks
                wizardContext.pickedNodes.pop();
            }

            // And rethrow
            throw err;
        }
    }

    public shouldPrompt(_wizardContext: QuickPickWizardContext<TModel>): boolean {
        return true;
    }

    protected async getPicks(wizardContext: QuickPickWizardContext<TModel>): Promise<IAzureQuickPickItem<TModel>[]> {
        const lastItem: TModel | undefined = wizardContext.pickedNodes.length ? wizardContext.pickedNodes[wizardContext.pickedNodes.length - 1] : undefined;
        const children = (await this.treeDataProvider.getChildren(lastItem)) || [];

        const matchingChildren = children.filter(c => matchesContextValueFilter(c, this.contextValueFilter));
        const nonLeafChildren = children.filter(c => c.quickPickOptions?.isLeaf === false);

        let promptChoices: TModel[];
        if (matchingChildren.length === 0) {
            if (nonLeafChildren.length === 0) {
                throw new NoResourceFoundError();
            } else {
                promptChoices = nonLeafChildren;
            }
        } else {
            promptChoices = matchingChildren;
        }

        const picks: IAzureQuickPickItem<TModel>[] = [];
        for (const choice of promptChoices) {
            picks.push(await this.getQuickPickItem(choice));
        }

        return picks;
    }

    protected async promptInternal(wizardContext: QuickPickWizardContext<TModel>): Promise<TModel> {
        const selected = await wizardContext.ui.showQuickPick(await this.getPicks(wizardContext), { /* TODO: options */ });
        wizardContext.pickedNodes.push(selected.data);
        return selected.data;
    }

    private async getQuickPickItem(resource: TModel): Promise<IAzureQuickPickItem<TModel>> {
        const treeItem = await Promise.resolve(this.treeDataProvider.getTreeItem(resource));

        return {
            label: ((treeItem.label as vscode.TreeItemLabel)?.label || treeItem.label) as string,
            description: treeItem.description as string,
            data: resource,
        };
    }
}
