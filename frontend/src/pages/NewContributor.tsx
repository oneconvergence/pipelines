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
import BusyButton from '../atoms/BusyButton';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import Input from '../atoms/Input';
import InputAdornment from '@material-ui/core/InputAdornment';
import { ApiExperiment, ApiResourceType, ApiRelationship } from '../apis/experiment';
import { Apis, PipelineSortKeys } from '../lib/Apis';
import { Page, PageProps } from './Page';
import { RoutePage, QUERY_PARAMS } from '../components/Router';
import { TextFieldProps } from '@material-ui/core/TextField';
import { ToolbarProps } from '../components/Toolbar';
import { URLParser } from '../lib/URLParser';
import { classes, stylesheet } from 'typestyle';
import { commonCss, color, padding, fontsize } from '../Css';
import { logger, errorToMessage } from '../lib/Utils';
import { NamespaceContext } from 'src/lib/KubeflowClient';
import ResourceSelector from './ResourceSelector';
import { ApiPipeline, ApiParameter, ApiPipelineVersion } from '../apis/pipeline';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormLabel from '@material-ui/core/FormLabel';

interface NewContributorState {
  description: string;
  validationError: string;
  isbeingCreated: boolean;
  experimentName: string;
  pipelineId?: string;
  userSelectorOpen: boolean;
  unconfirmedSelectedUser: string;
  userSelected: string;
  userSelectedPermission: string;
}

const css = stylesheet({
  errorMessage: {
    color: 'red',
  },
  // TODO: move to Css.tsx and probably rename.
  explanation: {
    fontSize: fontsize.small,
  },
  nonEditableInput: {
    color: color.secondaryText,
  },
  selectorDialog: {
    // If screen is small, use calc(100% - 120px). If screen is big, use 1200px.
    maxWidth: 1200, // override default maxWidth to expand this dialog further
    minWidth: 680,
    width: 'calc(100% - 120px)',
  },
});

export class NewContributor extends Page<{ namespace?: string }, NewContributorState> {
  private _experimentNameRef = React.createRef<HTMLInputElement>();

  private userSelectorColumns = [
    {
      //  customRenderer: NameWithTooltip,
      flex: 1,
      label: 'User name',
      sortKey: PipelineSortKeys.NAME,
    },
    { label: 'Description', flex: 2 },
    { label: 'Uploaded on', flex: 1, sortKey: PipelineSortKeys.CREATED_AT },
  ];

  constructor(props: any) {
    super(props);

    this.state = {
      description: '',
      experimentName: '',
      isbeingCreated: false,
      validationError: '',
      userSelectorOpen: false,
      unconfirmedSelectedUser: '',
      userSelected: '',
      userSelectedPermission: 'view',
    };
  }

  public getInitialToolbarState(): ToolbarProps {
    return {
      actions: {},
      breadcrumbs: [{ displayName: 'Contributors', href: RoutePage.MANAGE_CONTRIBUTORS }],
      pageTitle: 'New contributor',
    };
  }

  public render(): JSX.Element {
    const {
      isbeingCreated,
      validationError,
      userSelectorOpen,
      unconfirmedSelectedUser,
      userSelected,
    } = this.state;

    return (
      <div className={classes(commonCss.page, padding(20, 'lr'))}>
        <div className={classes(commonCss.scrollContainer, padding(20, 'lr'))}>
          <div className={commonCss.header}>Contributor details</div>
          {/* TODO: this description needs work. */}
          <div className={css.explanation}>
            Think of an Experiment as a space that contains the history of all pipelines and their
            associated runs
          </div>
          <Input
            value={userSelected}
            required={true}
            label='User'
            disabled={true}
            variant='outlined'
            InputProps={{
              classes: { disabled: css.nonEditableInput },
              endAdornment: (
                <InputAdornment position='end'>
                  <Button
                    color='secondary'
                    id='chooseUserBtn'
                    onClick={() => this.setStateSafe({ userSelectorOpen: true })}
                    style={{ padding: '3px 5px', margin: 0 }}
                  >
                    Choose
                  </Button>
                </InputAdornment>
              ),
              readOnly: true,
            }}
          />

          <Dialog
            open={userSelectorOpen}
            classes={{ paper: css.selectorDialog }}
            onClose={() => this._userSelectorClosed(false)}
            PaperProps={{ id: 'userSelectorDialog' }}
          >
            <DialogContent>
              <ResourceSelector
                {...this.props}
                title='Choose a contributor'
                filterLabel='Filter contributors'
                listApi={async (...args) => {
                  const response = await Apis.getOnboardedUsers();
                  console.log('response', response);
                  return {
                    nextPageToken: response.next_page_token || '',
                    resources: response || [],
                  };
                }}
                columns={this.userSelectorColumns}
                emptyMessage='No contributor found.'
                initialSortColumn={PipelineSortKeys.NAME}
                selectionChanged={(selectedUser: any) =>
                  this.setStateSafe({ unconfirmedSelectedUser: selectedUser.name })
                }
              />
            </DialogContent>
            <DialogActions>
              <Button
                id='cancelUserSelectionBtn'
                onClick={() => this._userSelectorClosed(false)}
                color='secondary'
              >
                Cancel
              </Button>
              <Button
                id='useUserBtn'
                onClick={() => this._userSelectorClosed(true)}
                color='secondary'
                disabled={!unconfirmedSelectedUser}
              >
                Use this user
              </Button>
            </DialogActions>
          </Dialog>
          <FormLabel>Set contributor permission</FormLabel>
          <RadioGroup
            aria-label='permissions'
            name='permissions'
            value={this.state.userSelectedPermission}
            onChange={(event: any) => this.setState({ userSelectedPermission: event.target.value })}
          >
            <FormControlLabel value='view' control={<Radio color='primary' />} label='View' />
            <FormControlLabel value='edit' control={<Radio color='primary' />} label='Edit' />
          </RadioGroup>
          <div className={commonCss.flex}>
            <BusyButton
              id='createNewContributorBtn'
              disabled={!!validationError}
              busy={isbeingCreated}
              className={commonCss.buttonAction}
              title={'Add'}
              onClick={this._create.bind(this)}
            />
            <Button
              id='cancelNewContributorBtn'
              onClick={() => this.props.history.push(RoutePage.MANAGE_CONTRIBUTORS)}
            >
              Cancel
            </Button>
            <div className={css.errorMessage}>{validationError}</div>
          </div>
        </div>
      </div>
    );
  }

  public async refresh(): Promise<void> {
    return;
  }

  public async componentDidMount(): Promise<void> {
    const urlParser = new URLParser(this.props);
    const pipelineId = urlParser.get(QUERY_PARAMS.pipelineId);
    if (pipelineId) {
      this.setState({ pipelineId });
    }

    this._validate();
  }

  public handleChange = (name: string) => (event: any) => {
    const value = (event.target as TextFieldProps).value;
    this.setState({ [name]: value } as any, this._validate.bind(this));
  };

  protected async _userSelectorClosed(confirmed: boolean): Promise<void> {
    this.setStateSafe(
      {
        userSelected: confirmed ? this.state.unconfirmedSelectedUser : '',
        userSelectorOpen: false,
      },
      () => this._validate(),
    );
  }
  private _create(): void {
    const newContributor: any = {
      user: { kind: 'User', name: this.state.userSelected },
      referredNamespace: localStorage.getItem('user'),
      RoleRef: { kind: 'ClusterRole', name: this.state.userSelectedPermission },
    };

    this.setState({ isbeingCreated: true }, async () => {
      try {
        console.log('newContributor', newContributor);
        // const response = await Apis.experimentServiceApi.createExperiment(newExperiment);

        this.props.history.push(RoutePage.MANAGE_CONTRIBUTORS);
        this.props.updateSnackbar({
          autoHideDuration: 10000,
          message: `Successfully added new Contributor: ${newContributor.name}`,
          open: true,
        });
      } catch (err) {
        const errorMessage = await errorToMessage(err);
        await this.showErrorDialog('Add contributor failed', errorMessage);
        logger.error('Error adding contributor:', err);
        this.setState({ isbeingCreated: false });
      }
    });
  }

  private _validate(): void {
    // Validate state
    const { userSelected } = this.state;
    try {
      if (!userSelected) {
        throw new Error('User is required');
      }
      this.setState({ validationError: '' });
    } catch (err) {
      this.setState({ validationError: err.message });
    }
  }
}

const EnhancedNewContributor: React.FC<PageProps> = props => {
  const namespace = React.useContext(NamespaceContext);
  return <NewContributor {...props} namespace={namespace} />;
};

export default EnhancedNewContributor;
