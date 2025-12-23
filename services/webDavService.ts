
import { UsageLog, WebDavConfig } from "../types";

/**
 * WebDAV Service for interacting with cloud storage like JianGuoYun
 * This version supports multi-device merging and deduplication.
 */
export const webDavSync = async (config: WebDavConfig, localLogs: UsageLog[]): Promise<UsageLog[]> => {
  const { url, username, token, remotePath } = config;
  const auth = btoa(`${username}:${token}`);
  const fullUrl = `${url.replace(/\/$/, '')}${remotePath}`;

  try {
    // 1. Fetch the master file from cloud (The central hub for all devices)
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      }
    });

    let cloudLogs: UsageLog[] = [];
    if (response.ok) {
      const data = await response.json();
      cloudLogs = Array.isArray(data) ? data : [];
    } else if (response.status !== 404) {
      throw new Error(`无法访问云端存储: ${response.statusText}`);
    }

    // 2. Advanced Multi-Source Merging Strategy
    // We use a Map keyed by id to ensure uniqueness across devices
    const mergedMap = new Map<string, UsageLog>();

    // Add local logs first
    localLogs.forEach(l => mergedMap.set(l.id, { ...l, syncStatus: 'pending' }));
    
    // Add cloud logs (Cloud state overrides local sync status)
    cloudLogs.forEach(l => {
      mergedMap.set(l.id, { ...l, syncStatus: 'synced' });
    });

    // Convert back to array and sort chronologically (Newest first)
    const mergedLogs = Array.from(mergedMap.values())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    // 3. Push the consolidated history back to the cloud hub
    const pushResponse = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mergedLogs)
    });

    if (!pushResponse.ok) {
      throw new Error(`数据汇聚失败: ${pushResponse.statusText}`);
    }

    return mergedLogs.map(l => ({ ...l, syncStatus: 'synced' }));
  } catch (error) {
    console.error("WebDAV Sync Error:", error);
    throw error;
  }
};
