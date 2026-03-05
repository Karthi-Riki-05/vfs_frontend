"use client";

import { useState, useEffect, useCallback } from 'react';
import { teamsApi } from '@/api/teams.api';
import { message } from 'antd';

export function useTeams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teamsApi.list();
      const d = res.data?.data || res.data || {};
      setTeams(d.teams || (Array.isArray(d) ? d : []));
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const createTeam = async (data: { name: string; description?: string }) => {
    try {
      await teamsApi.create(data);
      message.success('Team created');
      fetchTeams();
    } catch {
      message.error('Failed to create team');
    }
  };

  const deleteTeam = async (id: string) => {
    try {
      await teamsApi.delete(id);
      message.success('Team deleted');
      fetchTeams();
    } catch {
      message.error('Failed to delete team');
    }
  };

  const updateTeam = async (id: string, data: { name?: string; description?: string }) => {
    try {
      await teamsApi.update(id, data);
      message.success('Team updated');
      fetchTeams();
    } catch {
      message.error('Failed to update team');
    }
  };

  return { teams, loading, fetchTeams, createTeam, deleteTeam, updateTeam };
}
