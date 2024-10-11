import React, { useEffect, useState } from 'react';
import { Apis } from 'src/lib/Apis'; // Adjust the import path as needed
import { logger } from 'src/lib/Utils'; // Adjust the import path as needed
import { Execution } from 'src/third_party/mlmd';
import { KfpExecutionProperties } from 'src/mlmd/MlmdUtils';
import { commonCss } from 'src/Css';

interface DKubeTabProps {
  execution: any;
}
const DKubeTab: React.FC<DKubeTabProps> = ({ execution }) => {
  const [dkubeData, setDkubeData] = useState({
    deployment: null,
    jobid: null,
    jobname: null,
    jobtype: null,
    loading: false,
    user: null,
    runType: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDkubeJobInfo = async () => {
      try {
        setLoading(true);

        if (execution) {
          const customPropertiesMap = execution.getCustomPropertiesMap();
          const podName =
            customPropertiesMap.get(KfpExecutionProperties.POD_NAME)?.getStringValue() || '';
          const dkubeResponse = await Apis.getDkubeJobInfo(podName);
          console.log('dkubeResponse', dkubeResponse);
          // const dkubeJobInfo = JSON.parse(dkubeResponse);
          // console.log("dkubeJobInfo",dkubeJobInfo)
          const obj = JSON.parse(dkubeResponse);
          const user = obj.data.parameters.generated.user;
          const runType = obj.data.parameters.class;
          const jobid = obj.data.parameters.generated.jobid;
          const deployment = obj.data.parameters.generated.uuid;
          const jobtype = obj.data.parameters.generated.subclass;
          const jobname = obj.data.name;
          setDkubeData({
            deployment: deployment,
            jobid: jobid,
            jobname: jobname,
            jobtype: jobtype,
            loading: false,
            user: user,
            runType: runType,
          });
        }
      } catch (err) {
        setError('Error getting DKube job details');
        logger.error('Error getting DKube job details', err);
      } finally {
        setLoading(false);
      }
    };

    if (execution) {
      fetchDkubeJobInfo();
    }

    return () => {
      setDkubeData({
        deployment: null,
        jobid: null,
        jobname: null,
        jobtype: null,
        loading: false,
        user: null,
        runType: '',
      });
    };
  }, [execution]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!dkubeData) {
    return <div>No DKube job data available.</div>;
  }

  let url =
    'https://192.168.200.131:32222/#/ds/jobs/runs/' +
    dkubeData.runType +
    '/user/' +
    dkubeData.user +
    '/' +
    dkubeData.jobname +
    '/' +
    dkubeData.jobid +
    '?tab=summary&iframe=true';
  if (dkubeData.runType === 'serving') {
    url =
      '/#/ds/deployments/all/user/' +
      dkubeData.user +
      '/' +
      dkubeData.jobname +
      '/' +
      dkubeData.deployment +
      '?tab=details&menu=all&iframe=true';
  }

  return (
    <div className={commonCss.page}>
      <iframe
        src={url}
        style={{ height: '100vh' }}
        title={dkubeData.runType}
      />
    </div>
  );
};

export default DKubeTab;
