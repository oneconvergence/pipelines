import React, { FC, useState, useEffect } from 'react';
import { logger, extendError } from './Utils';
import { Apis } from './Apis';

export interface GkeMetadata {
  projectId?: string;
  clusterName?: string;
}
export const GkeMetadataContext = React.createContext<GkeMetadata>({});
export const GkeMetadataProvider: FC<{}> = props => {
  const [metadata, setMetadata] = useState({});
  return <GkeMetadataContext.Provider value={metadata} {...props} />;
};
