/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const MAX_TAB_RECORDS = 500;

const records = new Map();

function createBuffer(initialRecords = []) {
    const buffer = {
        items: new Array(MAX_TAB_RECORDS),
        start: 0,
        length: 0,
        total: 0,
    };
    for (const record of initialRecords.slice(-MAX_TAB_RECORDS)) {
        append(buffer, record);
    }
    buffer.total = buffer.length;
    return buffer;
}

function append(buffer, record) {
    let index = (buffer.start + buffer.length) % MAX_TAB_RECORDS;
    if (buffer.length === MAX_TAB_RECORDS) {
        index = buffer.start;
        buffer.start = (buffer.start + 1) % MAX_TAB_RECORDS;
    } else {
        buffer.length += 1;
    }
    buffer.items[index] = record;
    buffer.total = Math.min(buffer.total + 1, Number.MAX_SAFE_INTEGER);
}

function toArray(buffer) {
    if (!buffer) {
        return undefined;
    }
    return Array.from(
        { length: buffer.length },
        (_, index) => buffer.items[(buffer.start + index) % MAX_TAB_RECORDS]
    );
}

export function add(tabId, record) {
    let buffer = records.get(tabId);
    if (!buffer) {
        buffer = createBuffer();
        records.set(tabId, buffer);
    }
    append(buffer, record);
    return buffer.total;
}

export function has(tabId) {
    return records.has(tabId);
}

export function keys() {
    return records.keys();
}

export function clear() {
    return records.clear();
}

export function getTabRecords() {
    return browser.tabs
        .query({
            currentWindow: true,
            active: true,
        })
        .then((tabs) => {
            return toArray(records.get(tabs[0].id));
        });
}

export function setTabRecords(tabId, tabRecords) {
    return records.set(tabId, createBuffer(tabRecords));
}

export function removeTabRecords(tabId) {
    records.delete(tabId);
}

export function getLastRedirectRecords(tabId, url, isServerRedirect = false, limit = 5) {
    const tabRecords = toArray(records.get(tabId));
    if (!tabRecords) {
        return [];
    }
    const lastRecord = getLastRedirectRecord(tabRecords, url, isServerRedirect, limit);

    if (!lastRecord) {
        return [];
    }
    return getLinkedRedirectRecords(lastRecord, tabRecords, limit);
}

function getLastRedirectRecord(records, url, isServerRedirect, limit) {
    let i = 0;
    while (i < limit && records.length > 0) {
        const record = records.pop();
        if (record.target === url || (isServerRedirect && record.target)) {
            return record;
        }
        i++;
    }
    return null;
}

function getLinkedRedirectRecords(record, records, limit) {
    let lastRecord = record;
    const linked = [lastRecord];
    let i = 0;
    while (i < limit && records.length > 0) {
        const record = records.pop();
        if (record.target && record.target === lastRecord.url) {
            linked.unshift(record);
            lastRecord = record;
        }
        i++;
    }
    return linked;
}
