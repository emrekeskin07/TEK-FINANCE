import React from 'react';
import PropTypes from 'prop-types';

export default function AssetStatusMessage({ errorMessage, successMessage }) {
  if (errorMessage) {
    return <p className="mt-1 text-xs text-rose-400">{errorMessage}</p>;
  }

  if (successMessage) {
    return <p className="mt-1 text-xs text-emerald-300">{successMessage}</p>;
  }

  return null;
}

AssetStatusMessage.propTypes = {
  errorMessage: PropTypes.string,
  successMessage: PropTypes.string,
};

AssetStatusMessage.defaultProps = {
  errorMessage: '',
  successMessage: '',
};
