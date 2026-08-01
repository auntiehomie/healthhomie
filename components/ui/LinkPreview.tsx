import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

interface LinkPreviewProps {
  url: string;
  style?: View['props']['style'];
}

interface LinkMetadata {
  title: string;
  description: string;
  image: string;
  siteName: string;
}

export function LinkPreview({ url, style }: LinkPreviewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMetadata() {
      try {
        // Try to fetch Open Graph / meta tags from the URL
        // Using a CORS proxy since we can't directly fetch from client
        const response = await fetch(
          `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!cancelled) {
          if (response.ok) {
            const text = await response.text();
            // Jina AI returns extracted content - parse for title/description
            const titleMatch = text.match(/Title:\s*(.+)/);
            const descMatch = text.match(/Description:\s*(.+)/);
            const imageMatch = text.match(/Image:\s*(.+)/);

            setMetadata({
              title: titleMatch?.[1]?.trim() || new URL(url).hostname,
              description: descMatch?.[1]?.trim() || text.substring(0, 200) + '...',
              image: imageMatch?.[1]?.trim() || '',
              siteName: new URL(url).hostname,
            });
          } else {
            throw new Error('Failed to fetch');
          }
        }
      } catch (err) {
        if (!cancelled) {
          // Fallback: show basic URL info
          try {
            const hostname = new URL(url).hostname;
            setMetadata({
              title: hostname,
              description: url,
              image: '',
              siteName: hostname,
            });
          } catch {
            setError('Invalid URL');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMetadata();
    return () => { cancelled = true; };
  }, [url]);

  if (error) return null;
  if (loading && !metadata) return (
    <View style={styles.loading}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );

  if (!metadata) return null;

  return (
    <Pressable style={[styles.container, style]} onPress={() => Linking.openURL(url)}>
      {metadata.image && (
        <Image
          source={{ uri: metadata.image }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <View style={styles.content}>
        <Text style={styles.siteName} numberOfLines={1}>{metadata.siteName}</Text>
        <Text style={styles.title} numberOfLines={2}>{metadata.title}</Text>
        <Text style={styles.description} numberOfLines={3}>{metadata.description}</Text>
      </View>
    </Pressable>
  );
}

// Need to import Linking
import { Linking } from 'react-native';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginVertical: 8,
    },
    loading: {
      padding: 16,
      alignItems: 'center',
    },
    image: {
      width: 80,
      height: 80,
      borderRadius: 12,
    },
    content: {
      flex: 1,
      padding: 12,
      justifyContent: 'center',
      gap: 4,
    },
    siteName: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 20,
    },
    description: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
  });

// Helper to extract URLs from text
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}