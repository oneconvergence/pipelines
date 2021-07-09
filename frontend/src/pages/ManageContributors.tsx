/*
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react';
import Buttons, { ButtonKeys } from '../lib/Buttons';
import CustomTable, { Column, Row } from '../components/CustomTable';
import { Apis, PipelineSortKeys, ListRequest } from '../lib/Apis';
import { Page } from './Page';
import { ToolbarProps } from '../components/Toolbar';
import { classes } from 'typestyle';
import { commonCss, padding } from '../Css';

interface ContributorListState {
  selectedIds: string[];
  uploadDialogOpen: boolean;

  // selectedVersionIds is a map from string to string array.
  // For each pipeline, there is a list of selected version ids.
  selectedVersionIds: { [pipelineId: string]: string[] };
  displayContributors: any[];
}

class ContributorList extends Page<{}, ContributorListState> {
  private _tableRef = React.createRef<CustomTable>();

  constructor(props: any) {
    super(props);

    this.state = {
      selectedIds: [],
      uploadDialogOpen: false,

      selectedVersionIds: {},
      displayContributors: [],
    };
  }

  public getInitialToolbarState(): ToolbarProps {
    const buttons = new Buttons(this.props, this.refresh.bind(this));
    return {
      actions: buttons
        .newContributor('Add contributor')
        .refresh(this.refresh.bind(this))
        .deleteContributor(
          () => this.state.selectedIds,
          (ids, status) => this._selectionChanged(ids),
          false /* useCurrentResource */,
        )
        .getToolbarActionMap(),
      breadcrumbs: [],
      pageTitle: 'Contributors',
    };
  }

  public render(): JSX.Element {
    const columns: Column[] = [
      {
        flex: 1,
        label: 'Username',
        sortKey: PipelineSortKeys.NAME,
      },
      { label: 'Permission', flex: 1 },
    ];
    let rows: Row[] = [];
    this.state.displayContributors.forEach(p => {
      if (p.RoleRef.name != 'admin')
        rows.push({
          id: JSON.stringify(p)!,
          otherFields: [p.user.name!, p.RoleRef.name!],
        });
    });

    return (
      <div className={classes(commonCss.page, padding(20, 'lr'))}>
        <CustomTable
          ref={this._tableRef}
          columns={columns}
          rows={rows}
          initialSortColumn={PipelineSortKeys.CREATED_AT}
          updateSelection={this._selectionChanged.bind(this)}
          selectedIds={this.state.selectedIds}
          reload={this._reload.bind(this)}
          filterLabel='Filter contributors'
          emptyMessage='No contributors found. Click "Add contributor" to start.'
        />
      </div>
    );
  }

  public async refresh(): Promise<void> {
    if (this._tableRef.current) {
      await this._tableRef.current.reload();
    }
  }

  private async _reload(request: ListRequest): Promise<string> {
    let response: any | null = null;
    let displayContributors: any[];
    try {
      response = await Apis.listContributors();
      displayContributors = response.bindings || [];
      this.setStateSafe({ displayContributors: displayContributors || [] });
      this.clearBanner();
    } catch (err) {
      await this.showPageError('Error: failed to retrieve list of contributors.', err);
    }

    return response ? response.next_page_token || '' : '';
  }

  private _selectionChanged(selectedIds: string[]): void {
    const toolbarActions = this.props.toolbarProps.actions;
    toolbarActions[ButtonKeys.DELETE_CONTRIBUTOR].disabled = selectedIds.length !== 1;
    this.props.updateToolbar({
      actions: toolbarActions,
      breadcrumbs: this.props.toolbarProps.breadcrumbs,
    });
    this.setState({ selectedIds });
  }
}

export default ContributorList;
