"use client";

import React, { useRef, useState } from "react";
import { AutoComplete, Avatar, Spin, Tag, Typography } from "antd";
import { superAdminApi, UserSearchResult } from "@/api/superAdmin.api";

const { Text } = Typography;

interface Props {
  value?: UserSearchResult | null;
  onChange: (user: UserSearchResult | null) => void;
  placeholder?: string;
}

export default function UserSearchSelect({
  value,
  onChange,
  placeholder = "Type to search by name or email",
}: Props) {
  const [options, setOptions] = useState<
    { value: string; label: React.ReactNode; user: UserSearchResult }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState(
    value ? value.email || value.name || "" : "",
  );
  const debounceRef = useRef<any>(null);

  const handleSearch = (q: string) => {
    setText(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setOptions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await superAdminApi.searchUsers(q.trim());
        const users = res.data?.data || [];
        setOptions(
          users.map((u) => ({
            value: u.id,
            user: u,
            label: (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar size="small" src={u.image || undefined}>
                  {u.name?.[0] || u.email?.[0]}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {u.name || "Unnamed"}
                  </div>
                  <div style={{ fontSize: 11, color: "#8C8C8C" }}>
                    {u.email}
                  </div>
                </div>
                <Tag
                  color={
                    u.hasPro
                      ? "blue"
                      : u.currentVersion === "team"
                        ? "purple"
                        : undefined
                  }
                >
                  {u.hasPro ? "Pro" : u.currentVersion}
                </Tag>
              </div>
            ),
          })),
        );
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (val: string) => {
    const found = options.find((o) => o.value === val);
    if (found) {
      onChange(found.user);
      setText(found.user.email || found.user.name || "");
    }
  };

  return (
    <AutoComplete
      value={text}
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      onChange={(v) => setText(v)}
      onClear={() => {
        onChange(null);
        setOptions([]);
      }}
      allowClear
      placeholder={placeholder}
      style={{ width: "100%" }}
      notFoundContent={
        loading ? <Spin size="small" /> : <Text type="secondary">No users</Text>
      }
    />
  );
}
