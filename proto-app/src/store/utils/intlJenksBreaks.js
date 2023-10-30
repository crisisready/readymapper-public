// intlJenksBreaks.js
import configs from '../../../../configs.json'
import { helpers } from '../../helpers' 

const baseUrlData = process.env.NODE_ENV === "development"
    ? '/data'
    : `${configs.s3.cloudfrontBaseUrl}/${configs.s3.outputFolder}`;

export default function fetchIntlJenksBreaks() {
    return helpers.fetchJson(`${baseUrlData}/jenks-breaks/intl_jenks_breaks.json`)
        .then(data => {
            return data;
        })
        .catch(error => {
            console.error("Error loading intlJenksBreaks data:", error);
        });
}

