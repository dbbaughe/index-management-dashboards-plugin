/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import _ from "lodash";
import { ExplainAPIManagedIndexMetaData, QueryStringQuery } from "../models/interfaces";
import { MatchAllQuery } from "../models/types";
import { ManagedIndexMetaData } from "../../models/interfaces";

export function transformManagedIndexMetaData(metaData: ExplainAPIManagedIndexMetaData | undefined): ManagedIndexMetaData | null {
  if (!metaData) return null;
  // If this is not a managed index or we are still initializing we still return the
  // plugins.index_state_management.policy_id setting, but nothing else from the explain API
  if (!metaData.index) return null;
  return {
    index: metaData.index,
    // We know indexUuid and policyName exist if index exists
    indexUuid: metaData.index_uuid as string,
    policyId: metaData.policy_id as string,
    policySeqNo: metaData.policy_seq_no,
    policyPrimaryTerm: metaData.policy_primary_term,
    policyCompleted: metaData.policy_completed,
    rolledOver: metaData.rolled_over,
    transitionTo: metaData.transition_to,
    state: metaData.state ? { name: metaData.state.name, startTime: metaData.state.start_time } : undefined,
    action: metaData.action
      ? {
          name: metaData.action.name,
          startTime: metaData.action.start_time,
          index: metaData.action.index,
          failed: metaData.action.failed,
          consumedRetries: metaData.action.consumed_retries,
        }
      : undefined,
    retryInfo: metaData.retry_info
      ? { failed: metaData.retry_info.failed, consumedRetries: metaData.retry_info.consumed_retries }
      : undefined,
    info: metaData.info,
  };
}

export function getMustQuery<T extends string>(field: T, search: string): MatchAllQuery | QueryStringQuery<T> {
  const str = search.trim();
  if (search.trim()) {
    return {
      query_string: {
        default_field: field,
        default_operator: "AND",
        query: str ? `*${str.split(" ").join("* *")}*` : "*",
      },
    };
  }

  return { match_all: {} };
}

export function getSearchString(terms?: string[], indices?: string[], dataStreams?: string[], showDataStreams: boolean = true): string {
  // Terms are searched with a wildcard around them.
  const searchTerms = terms ? `*${_.castArray(terms).join("*,*")}*` : "";

  // Indices and data streams are searched with an exact match.
  const searchIndices = indices ? _.castArray(indices).join(",") : "";
  const searchDataStreams = dataStreams ? _.castArray(dataStreams).join(",") : "";

  // The overall search string is a combination of terms, indices, and data streams.
  // If the search string is blank, then '*' is used to match everything.
  const resolved = [searchTerms, searchIndices, searchDataStreams].filter((value) => value !== "").join(",") || "*";
  // We don't want to fetch managed datastream indices if there are not selected by caller.
  return showDataStreams ? resolved : resolved + " -.ds"
}
