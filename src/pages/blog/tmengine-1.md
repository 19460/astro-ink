---
layout: $/layouts/post.astro
title: TMEngine
description: TMEngine介绍及使用
tags:
  - 无
author: 王洪涛
authorTwitter: 无
date: 2022-09-21T09:44:31.063Z
---
## 什么是TMEngine

TMEngine：Translation Memory Engine

### 翻译记忆库 （TM）

**翻译记忆库 (TM)** 是一种语言技术，可以通过在数据库中搜索相似的片段来分割文档（句子、段落或短语），并在数据库中找到匹配项完成翻译。 

TM 系统会记住人工翻译输入的翻译。当需要再次翻译的时候 ，翻译者不需要需要处理类似的文本，系统提供之前保存的版本。                         当翻译人员处理重复性文本（例如技术文本）时，这可以节省大量时间手册，还可以帮助实现术语的一致性。 

### 翻译记忆库交换格式（TMX） 

[Translation Memory Exchange format](https://web.archive.org/web/20080501083903/http://www.lisa.org/tmx)（翻译记忆交换格式），TMX标准实现不同翻译软体供应商之间翻译记忆库的互换，为翻译社群所采纳的汇入汇出翻译记忆的最佳办法。目前最新的版本是1.4b，允许从TMX资料重建来源文件和目标文件。

```xml
<tu creationdate="20191223T064445Z" creationid="EC151\tritally" changedate="20191223T080837Z" changeid="EC151\tritally" lastusagedate="20191224T071051Z" usagecount="1">
      <prop type="x-LastUsedBy">EC151\tritally</prop>
      <prop type="x-Origin">TM</prop>
      <prop type="x-ConfirmationLevel">Translated</prop>
      <prop type="x-StructureContext:MultipleString">x-tm-length-info</prop>
      <tuv xml:lang="zh-CN">
        <seg>内容</seg>
      </tuv>
      <tuv xml:lang="en-US">
        <seg>content</seg>
      </tuv>
    </tu>
```



## TMEngine工作流程

![](http://www.wanghongtao.xyz/2022-09-21/image-20220921092909823.png)



## TMEngine的使用



## TM 搜索类型 

- **精确搜索：** 仅从数据存储库。 

```java
//精确搜索
/**
*srcLang:源语言
*searchStr:目标翻译语句
*/
if (similarity == 100) {
			// check for perfect matches
			Set<String> perfect = tuvDb.getPerfectMatches(srcLang, searchStr);
			if (!perfect.isEmpty()) {
				Iterator<String> it = perfect.iterator();
				while (it.hasNext()) {
					String tuid = it.next();
					String puretext = tuvDb.getPureText(srcLang, tuid.hashCode());
					boolean isMatch = true;
					if (caseSensitive) {
						isMatch = searchStr.equals(puretext);
					}
					if (isMatch) {
						String targetSeg = tuvDb.getSegText(tgtLang, tuid);
						if (targetSeg != null) {
							String sourceSeg = tuvDb.getSegText(srcLang, tuid);
							Element source = TMUtils.buildTuv(srcLang, sourceSeg);
							Element target = TMUtils.buildTuv(tgtLang, targetSeg);
							Map<String, String> properties = tuDb.getTu(tuid.hashCode());
							Match match = new Match(source, target, 100, dbname, properties);
							result.add(match);
						}
					}
				}
			}
		}
```



- **模糊搜索：** 与搜索到的文本相似的条目查询中指定的范围从数据存储库中检索。

```java
/**
* 模糊匹配
* srcLang:源语言
* searchStr:目标翻译语句
*/
if (similarity < 100) {
			// Check for fuzzy matches
			int[] ngrams = NGrams.getNGrams(searchStr);
			int size = ngrams.length;
			if (size == 0) { 	
				return result;
			}
			int min = size * similarity / 100;
			int max = size * (200 - similarity) / 100;

			Map<String, Integer> candidates = new Hashtable<>();
			String lowerSearch = searchStr.toLowerCase();

			NavigableSet<Fun.Tuple2<Integer, String>> index = fuzzyIndex.getIndex(srcLang);
			for (int i = 0; i < ngrams.length; i++) {
				Iterable<String> keys = Fun.filter(index, ngrams[i]);
				Iterator<String> it = keys.iterator();
				while (it.hasNext()) {
					String tuid = it.next();
					if (candidates.containsKey(tuid)) {
						int count = candidates.get(tuid);
						candidates.put(tuid, count + 1);
					} else {
						candidates.put(tuid, 1);
					}
				}
			}

			Set<String> tuids = candidates.keySet();
			Iterator<String> it = tuids.iterator();
			while (it.hasNext()) {
				String tuid = it.next();
				int count = candidates.get(tuid);
				if (count >= min && count <= max) {
					int distance;
					String puretext = tuvDb.getPureText(srcLang, tuid.hashCode());
					if (caseSensitive) {
						distance = MatchQuality.similarity(searchStr, puretext);
					} else {
						distance = MatchQuality.similarity(lowerSearch, puretext.toLowerCase());
					}
					if (distance >= similarity) {
						String targetSeg = tuvDb.getSegText(tgtLang, tuid);
						if (targetSeg != null) {
							String sourceSeg = tuvDb.getSegText(srcLang, tuid);
							Element source = TMUtils.buildTuv(srcLang, sourceSeg);
							Element target = TMUtils.buildTuv(tgtLang, targetSeg);
							Map<String, String> properties = tuDb.getTu(tuid.hashCode());
							Match match = new Match(source, target, distance, dbname, properties);
							result.add(match);
						}
					}
				}
			}
		}
```

### **Levenshtein distance**算法

**Levenshtein distance**：又称编辑距离算法，**是指两个字符串之间，由一个转成另一个所需要的最小 编辑操作次数。**许可的编辑操作包括将一个字符替换成另一个字符，插入一个字符，删除一个字符。

> 一般来说，编辑距离越小，两个串的相似度越大。

### **Levenshtein distance**算法实现

首先我们先创建一个矩阵，或者说是我们的二维数列，假设有两个字符串，我们的字符串的长度分别是m和n，那么，我们矩阵的维度就应该是(m+1)*(n+1).

![](http://www.wanghongtao.xyz/2022-09-21/image-20220921154554840.png)



**计算规则**就是：
 `d[i,j]=min(d[i-1,j]+1 、d[i,j-1]+1、d[i-1,j-1]+temp) `这三个当中的最小值。

我们用

- `d[i-1,j]+1`表示**增加**操作

- `d[i,j-1]+1` 表示我们的**删除**操作

- `d[i-1,j-1]+temp`表示我们的**替换**操作（其中temp由`str1[i] == str2[j]`决定）

  

  ![](http://www.wanghongtao.xyz/2022-09-21/image-20220921160845765.png)

  最终结果

![](http://www.wanghongtao.xyz/2022-09-21%2Fimage-20220921162047846.png)

**算法实现**

```java
package com.maxprograms.test;

public class minDistance {

    public static void main(String[] args) {
        int distance = minDistance("abc", "acbc");
        System.out.println(distance);
    }
    public static int minDistance(String word1, String word2){
        int n = word1.length();
        int m = word2.length();

        if(n * m == 0)
            return n + m;

        int[][] d = new int[n + 1][m + 1];
        for (int i = 0; i < n + 1; i++){
            d[i][0] = i;
        }

        for (int j = 0; j < m + 1; j++){
            d[0][j] = j;
        }

        for (int i = 1; i < n + 1; i++){
            for (int j = 1; j < m + 1; j++){
                int left = d[i - 1][j] + 1;//左
                int up = d[i][j - 1] + 1;//上
                int left_up = d[i - 1][j - 1];//左上
                if (word1.charAt(i - 1) != word2.charAt(j - 1))
                    left_up += 1;
                d[i][j] = Math.min(left, Math.min(up, left_up));
            }
        }
        for (int i = 1; i < n + 1; i++){
            System.out.print("[");
            for (int j = 1; j < m + 1; j++){
                System.out.print(d[i][j]+",");
            }
            System.out.println("]");
        }
        return d[n][m];
    }

}

```

