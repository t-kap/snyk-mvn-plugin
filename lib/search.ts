import {
  GetPackageData,
  PackageResource,
  MavenPackage,
  SnykHttpClient,
} from './parse/types';
import { PackageURL } from 'packageurl-js';
import * as debugLib from 'debug';
import * as path from 'path';

const debug = debugLib('snyk-mvn-plugin');

const PACKAGE_SEARCH_TYPE = 'maven';
const PACKAGE_SEARCH_ENDPOINT = '/packages';
const PACKAGE_SEARCH_VERSION = '2022-09-21~beta';

export async function getMavenPackageInfo(
  sha1: string,
  targetPath: string,
  snykHttpClient: SnykHttpClient,
): Promise<MavenPackage> {
  const searchResults = await searchMavenPackageByChecksum(
    sha1,
    targetPath,
    snykHttpClient,
  );
  if (searchResults.length == 0) {
    return fallbackPackageInfo(sha1, targetPath);
  }

  let foundPackage: MavenPackage | undefined;
  if (searchResults.length > 1) {
    const sha1Target = path.parse(targetPath).base;
    debug(`Got multiple results for ${sha1}, looking for ${sha1Target}`);
    foundPackage = searchResults.find((result) =>
      sha1Target.includes(result.groupId),
    );
  }

  return foundPackage || searchResults[0];
}

async function searchMavenPackageByChecksum(
  sha1: string,
  targetPath: string,
  snykHttpClient: SnykHttpClient,
): Promise<Array<MavenPackage>> {
  const { res, body } = await snykHttpClient({
    method: 'get',
    path: PACKAGE_SEARCH_ENDPOINT,
    qs: {
      version: PACKAGE_SEARCH_VERSION,
      package_type: PACKAGE_SEARCH_TYPE,
      package_sha1: sha1,
    },
  });

  if (!res?.statusCode || res?.statusCode >= 400 || !body) {
    debug(`Failed to resolve ${targetPath} using sha1 ${sha1}.`);
    return [];
  }

  return mapPackageSearchResult(body as GetPackageData, sha1, targetPath);
}

function mapPackageSearchResult(
  body: GetPackageData,
  sha1: string,
  targetPath: string,
): Array<MavenPackage> {
  return body.data
    .map((purl: PackageResource) => {
      try {
        const pkg = PackageURL.fromString(purl.id);
        const fallback = fallbackPackageInfo(sha1, targetPath);

        return {
          groupId: pkg.namespace || fallback.groupId,
          artifactId: pkg.name || fallback.artifactId,
          version: pkg.version || fallback.version,
        };
      } catch (_error) {
        debug(
          `Failed to parse package url components for ${targetPath} using sha1 '${sha1}.`,
        );
        return undefined;
      }
    })
    .filter(
      (mvnPackage: MavenPackage | undefined): mvnPackage is MavenPackage =>
        mvnPackage !== undefined,
    );
}

function fallbackPackageInfo(sha1: string, targetPath: string): MavenPackage {
  return {
    groupId: 'unknown',
    artifactId: `${targetPath}:${sha1}`,
    version: 'unknown',
  };
}
