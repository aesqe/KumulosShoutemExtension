import "./style.scss";

import {
  Button,
  ButtonToolbar,
  ControlLabel,
  FormControl,
  FormGroup,
  HelpBlock
} from "react-bootstrap";
import React, { Component, PropTypes } from "react";
import {
  fetchExtension,
  getExtension,
  updateExtensionSettings
} from "@shoutem/redux-api-sdk";

import { LoaderContainer } from "@shoutem/react-web-ui";
import _ from "lodash";
import { connect } from "react-redux";
import { shouldRefresh } from "@shoutem/redux-io";

import { navigateToUrl } from "../../utils";

class Beacons extends Component {
  static propTypes = {
    extension: PropTypes.object,
    fetchExtension: PropTypes.func,
    updateExtensionSettings: PropTypes.func,
    navigateToUrl: PropTypes.func
  };

  constructor(props) {
    super(props);

    this.handleTextChange = this.handleTextChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    props.fetchExtension();

    this.state = {
      error: null,
      nearBeeOrgId: _.get(props.extension, "settings.nearBeeOrgId"),
      nearBeeApiKey: _.get(props.extension, "settings.nearBeeApiKey"),
      // flag indicating if value in input field is changed
      hasChanges: false
    };
  }

  componentWillReceiveProps(nextProps) {
    const { extension } = this.props;
    const { extension: nextExtension } = nextProps;
    const { nearBeeOrgId, nearBeeApiKey } = this.state;

    if (_.isEmpty(nearBeeOrgId)) {
      this.setState({
        nearBeeOrgId: _.get(nextExtension, "settings.nearBeeOrgId")
      });
    }

    if (_.isEmpty(nearBeeApiKey)) {
      this.setState({
        nearBeeApiKey: _.get(nextExtension, "settings.nearBeeApiKey")
      });
    }

    if (extension !== nextExtension && shouldRefresh(nextExtension)) {
      this.props.fetchExtension();
    }
  }

  handleTextChange(field, event) {
    this.setState({
      [field]: event.target.value,
      hasChanges: true
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    this.handleSave();
  }

  handleSave() {
    const { extension } = this.props;
    const { nearBeeOrgId, nearBeeApiKey } = this.state;

    this.setState({ error: "", inProgress: true });
    this.props
      .updateExtensionSettings(extension, { nearBeeOrgId, nearBeeApiKey })
      .then(() => this.setState({ hasChanges: false, inProgress: false }))
      .catch(err => {
        this.setState({ error: err, inProgress: false });
      });
  }

  render() {
    const {
      error,
      hasChanges,
      inProgress,
      nearBeeOrgId,
      nearBeeApiKey
    } = this.state;

    return (
      <div className="hello-extension-settings-page clearfix">
        <form onSubmit={this.handleSubmit}>
          <FormGroup>
            <h3>NearBee Settings</h3>
            <p>
              Kumulos allows reacting to Eddystone beacons using the NearBee
              platform.
            </p>
            <p>
              To use these features, please configure the credentials obtained
              from your{" "}
              <a
                onClick={() =>
                  this.props.navigateToUrl("https://www.beaconstac.com")
                }
              >
                Beaconstac account settings
              </a>
              .
            </p>
            <ControlLabel>Organization ID:</ControlLabel>
            <FormControl
              type="text"
              className="form-control"
              value={nearBeeOrgId}
              onChange={this.handleTextChange.bind(this, "nearBeeOrgId")}
            />
            <p>
              The Organization ID is the number from your Organization, for
              example use "1234" from "1. Kumulos (1234)"
            </p>
            <ControlLabel>Developer Token:</ControlLabel>
            <FormControl
              type="text"
              className="form-control"
              value={nearBeeApiKey}
              onChange={this.handleTextChange.bind(this, "nearBeeApiKey")}
            />
          </FormGroup>
          {error && <HelpBlock className="text-error">{error}</HelpBlock>}
        </form>
        <ButtonToolbar>
          <Button
            bsStyle="primary"
            disabled={!hasChanges}
            onClick={this.handleSave}
          >
            <LoaderContainer isLoading={inProgress}>Save</LoaderContainer>
          </Button>
        </ButtonToolbar>
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  const { extensionName } = ownProps;

  return {
    extension: getExtension(state, extensionName)
  };
}

function mapDispatchToProps(dispatch, ownProps) {
  const { extensionName } = ownProps;

  return {
    navigateToUrl: url => dispatch(navigateToUrl(url)),
    fetchExtension: () => dispatch(fetchExtension(extensionName)),
    updateExtensionSettings: (extension, settings) =>
      dispatch(updateExtensionSettings(extension, settings))
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Beacons);
