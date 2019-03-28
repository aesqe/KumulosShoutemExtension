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
import { navigateToUrl } from "../../utils";
import { shouldRefresh } from "@shoutem/redux-io";

class Keys extends Component {
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
      apiKey: _.get(props.extension, "settings.apiKey"),
      secretKey: _.get(props.extension, "settings.secretKey"),
      fcmGoogleServicesJson: _.get(
        props.extension,
        "settings.fcmGoogleServicesJson"
      ),
      // flag indicating if value in input field is changed
      hasChanges: false
    };
  }

  componentWillReceiveProps(nextProps) {
    const { extension } = this.props;
    const { extension: nextExtension } = nextProps;
    const { apiKey, secretKey, fcmGoogleServicesJson } = this.state;

    if (_.isEmpty(apiKey)) {
      this.setState({
        apiKey: _.get(nextExtension, "settings.apiKey")
      });
    }

    if (_.isEmpty(secretKey)) {
      this.setState({
        secretKey: _.get(nextExtension, "settings.secretKey")
      });
    }

    if (_.isEmpty(fcmGoogleServicesJson)) {
      this.setState({
        fcmGoogleServicesJson: _.get(
          nextExtension,
          "settings.fcmGoogleServicesJson"
        )
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
    const { apiKey, secretKey, fcmGoogleServicesJson } = this.state;

    this.setState({ error: "", inProgress: true });
    this.props
      .updateExtensionSettings(extension, {
        apiKey,
        secretKey,
        fcmGoogleServicesJson
      })
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
      apiKey,
      secretKey,
      fcmGoogleServicesJson
    } = this.state;

    return (
      <div className="hello-extension-settings-page clearfix">
        <form onSubmit={this.handleSubmit}>
          <FormGroup>
            <h3>API Keys</h3>
            <p>
              These keys identify your app with your Kumulos application. These
              keys are retrieved from your{" "}
              <a
                onClick={() =>
                  this.props.navigateToUrl(
                    "https://docs.kumulos.com/apps/#the-app-dashboard"
                  )
                }
              >
                Kumulos application dashboard
              </a>
              .
            </p>
            <ControlLabel>API Key:</ControlLabel>
            <FormControl
              type="text"
              className="form-control"
              value={apiKey}
              onChange={this.handleTextChange.bind(this, "apiKey")}
            />
            <ControlLabel>Secret Key:</ControlLabel>
            <FormControl
              type="text"
              className="form-control"
              value={secretKey}
              onChange={this.handleTextChange.bind(this, "secretKey")}
            />
          </FormGroup>
          <ButtonToolbar>
            <Button
              bsStyle="primary"
              disabled={!hasChanges}
              onClick={this.handleSave}
            >
              <LoaderContainer isLoading={inProgress}>Save</LoaderContainer>
            </Button>
          </ButtonToolbar>
          {error && <HelpBlock className="text-error">{error}</HelpBlock>}
          <FormGroup>
            <h3>FCM</h3>
            <p>
              Kumulos uses FCM to send push notifications to Android users. You
              need to configure the google-services.json content in order for
              this to work correctly.
            </p>
            <ControlLabel>google-services.json file:</ControlLabel>
            <textarea
              type="text"
              cols="4"
              className="form-control"
              value={fcmGoogleServicesJson}
              onChange={this.handleTextChange.bind(
                this,
                "fcmGoogleServicesJson"
              )}
            />
            <p>
              You can retrieve this file from your{" "}
              <a
                onClick={() =>
                  this.props.navigateToUrl(
                    "https://console.firebase.google.com"
                  )
                }
              >
                Firebase Cloud Messaging Settings Page
              </a>
              .
            </p>
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
        <h3>Support</h3>
        <p>
          Something not going to plan? We're here to help! You can direct any of
          your Kumulos questions to our helpful support team, directly from{" "}
          <a
            onClick={() =>
              this.props.navigateToUrl(
                "https://kumulos.app.delivery/account/support"
              )
            }
          >
            your account
          </a>{" "}
          or our{" "}
          <a
            onClick={() =>
              this.props.navigateToUrl("https://kumulos.com/contact-us")
            }
          >
            contact form
          </a>
          .
        </p>
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
)(Keys);
