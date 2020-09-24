---
title: 리팩토링 일기 - CQRS
author: Gyeongjun Kim
date: 2020-09-06
hero: ./images/hero.png
---

안녕하세요. 셀러리 컴퍼니에서 [직고래](https://play.google.com/store/apps/details?id=com.sellerleecompany.jikgorae)를 개발하고 있는 코즈입니다.

## CQRS?
**Command Query Responsibility Segregation**

CQRS는 명령과 조회의 책임을 분리하는것 입니다. 흔히 CRUD라고 표현하는 작업중 R을 분리 하는 것이죠. 
그렇다면 왜 이런 패턴이 생겨나게 된 것일까요?

소프트웨어는 사용자의 요청을 처리하고 그 결과를 보여줍니다. 개발자는 사용자의 요청을 **잘** 처리하고, **잘** 보여줘야겠죠.
여기서 **잘**에 담긴 의미는 오류를 만들지 않는 것, 그리고 빠르게 보여주는 것 입니다.

그렇다면 오류를 만들지 않기 위해선 어떻게 해야할까요?

---

## 책임 분리 & Aggregate
사용자의 요청을 처리하는 과정에서 변경이 일어납니다. 요구 사항이 많아질수록, 다양한 요청을 받고 다양한 변경을 처리해야 합니다. 그리고 오류, 버그는 변경을 처리 할때 발생합니다.
만약 하나의 인스턴스가 여러 변경을 수행하는 책임을 갖고 있다면 변경의 영향을 제어하기 힘들어 집니다.

객체 지향 프로그래밍에선 단일 책임 원칙으로 모든 클래스는 하나의 책임만 가지고 클래스는 그 책임을 완전히 캡슐화해야 함을 강조합니다. 즉, 책임을 분리하고 메세지를 보냄으로써 그 책임을 수행하도록 합니다.

Domain-Driven Design에서 에릭 에반스는, **데이터 변경**의 단위를 Aggregate(집합체) 라는 개념으로 표현하여, 좀 더 구체적인 개발 방법에 대해 말합니다.

> An AGGREGATE is a cluster of associated objects that we treat as **a unit for the purpose of data changes.** Each AGGREGATE has a root and a boundary. The boundary defines what is inside the AGGREGATE. The root is a single, specific ENTITY contained in the AGGREGATE. The root is the only member of the AGGREGATE that outside objects are allowed to hold references to, although objects within the boundary may hold references to each other. ENTITIES other than the root have local identity, but that identity needs to be distinguishable only within the AGGREGATE, because no outside object can ever see it out of the context of the root ENTITY. 
>
> _Domain-Driven Design, Eric Evans_

데이터 변경의 단위 별로 나뉜 Aggregate는 요청들을 수행하고, 그 변경 사항을 Repository를 통하여 반영합니다. 따라서, Aggregate는 Transaction의 단위가 되고, Aggregate 마다 하나의 Repository가 존재하게 됩니다. 

## 조회

데이터 변경의 단위를 추적하는 Command와 데이터를 조회하는 Query는 관심사가 다르고, 관심사가 다르기 때문에 그 단위 또한 다르기 쉽습니다. 여러 Aggregate에 걸친 정보를 조회하고 싶을때가 생겨납니다. 
이런 데이터의 조회를 Repository를 이용하여 하게 된다면 각각의 Repository에서 Aggregate를 조회하고, 그 Aggregate들을 조합하여 응답하게 됩니다. 때문에, 쿼리의 개수가 늘게되고 조회해온 엔티티들을 조합하여 Response를 만들어내는 코드가 생겨납니다.

---

## 리팩토링
요구사항은 직고래의 Feed를 조회하는 것이고, 응답엔 Article 정보와 ArticleFavoriteCount(찜 개수), 그리고 LoginMember가 해당 게시물을 Favorite(찜) 한 상태인지에 대한 유무를 담아야 합니다.
여기서 Aggregate는 Article, ArticleFavoriteCount, Favorite 입니다.

(글에선 편의를 위해 Repository 호출 마다 주석을 달아 놨습니다.)


### 이전 코드
```java
public class ArticleViewService {

    ...
    
    public List<FeedResponse> showPage(Long lastArticleId, int size, Member loginMember) {
        PageRequest pageRequest = PageRequest.of(FIRST_PAGE, size);
	// DB connection
        List<Article> articles = articleRepository.findByIdLessThanAndTradeStateOrderByIdDesc(lastArticleId, TradeState.ON_SALE, pageRequest).getContent();

        Map<Article, Long> articleAndCount = toArticleAndFavoriteCount(articles);
        List<Long> favoriteCounts = toFavoriteCounts(articles, articleAndCount);
        List<Article> favorites = toFavorites(loginMember, articles);
        List<Boolean> favoriteStates = toFavoriteStates(articles, favorites);

        return FeedResponse.listOf(articles, favoriteCounts, favoriteStates);
    }
    
    private Map<Article, Long> toArticleAndFavoriteCount(List<Article> articles) {
    	// DB connection
        return articleFavoriteCountRepository
                .findAllByArticleInOrderByArticle(articles).stream()
                .collect(toMap(ArticleFavoriteCount::getArticle,
                        ArticleFavoriteCount::getFavoriteCount));
    }
    
    private List<Long> toFavoriteCounts(List<Article> articles, Map<Article, Long> articleAndFavoriteCount) {
        return articles.stream()
                .map(article -> articleAndFavoriteCount.getOrDefault(article, 0L))
                .collect(toList());
        }
	
    private List<Article> toFavorites(Member loginMember, List<Article> articles) {
        // DB connection
        return favoriteRepository.findAllByMemberAndArticleIn(loginMember, articles)
                .stream()
                .map(Favorite::getArticle)
                .collect(toList());
                
    private List<Boolean> toFavoriteStates(List<Article> articles, List<Article> favorites) {
        return articles.stream()
                .map(favorites::contains)
                .collect(toList());
    }
}
```
쿼리도 3번이고, 조회에 필요한 정보를 추출 하고 조합하기 위해 많은 코드들이 작성 되어야 했습니다.
Querydsl을 사용하여, 조회용 DAO를 만들어 Controller가 직접 요청하도록 리팩토링 진행 하였습니다.

### 바뀐 코드

```java
public class ArticleDao {
    private final JPAQueryFactory queryFactory;

        public List<FeedResponse> showPage(Long lastArticleId, int size, Member loginMember) {
            return queryFactory
                .select(new QFeedResponse(
                        article,
                        articleFavoriteCount.favoriteCount,
                        ExpressionUtils.as(JPAExpressions.selectFrom(favorite)
                                        .where(favorite.member.id.eq(loginMember.getId()),
                                                favorite.article.id.eq(article.id))
                                        .exists(), "favoriteState")))
                .distinct()
                .from(article)
                .leftJoin(articleFavoriteCount).on(article.id.eq(articleFavoriteCount.article.id))
                .where(article.id.lt(lastArticleId), article.tradeState.eq(TradeState.ON_SALE))
                .orderBy(article.id.desc())
                .limit(size)
                .fetch();
    }
}
```
쿼리는 한번으로 줄었고, 필요한 객체를 바로 만들어 내니 코드 또한 많이 줄어들었습니다.

### 쿼리 비교
#### 이전
```sql
    select
        article0_.article_id as article_1_0_,
        article0_.created_time as created_2_0_,
        article0_.modified_time as modified3_0_,
        article0_.member_id as member_i9_0_,
        article0_.category as category4_0_,
        article0_.contents as contents5_0_,
        article0_.price as price6_0_,
        article0_.title as title7_0_,
        article0_.trade_state as trade_st8_0_ 
    from
        article article0_ 
    where
        article0_.article_id<? 
        and article0_.trade_state=? 
    order by
        article0_.article_id desc limit ?
        
    ---

    select
        articlefav0_.article_favorite_count_id as article_1_1_,
        articlefav0_.article_id as article_3_1_,
        articlefav0_.favorite_count as favorite2_1_ 
    from
        article_favorite_count articlefav0_ 
    where
        articlefav0_.article_id in (
            ?
        ) 
    order by
        articlefav0_.article_id asc
        
    ---
    
    select
        favorite0_.favorite_id as favorite1_4_,
        favorite0_.article_id as article_2_4_,
        favorite0_.member_id as member_i3_4_ 
    from
        favorite favorite0_ 
    where
        favorite0_.member_id=? 
        and (
            favorite0_.article_id in (
                ?
            )
        )
```
#### 이후
```sql
    select
        distinct article0_.article_id as col_0_0_,
        articlefav1_.favorite_count as col_1_0_,
        exists (select
            1 
        from
            favorite favorite2_ 
        where
            favorite2_.member_id=? 
            and favorite2_.article_id=article0_.article_id) as col_2_0_,
        article0_.article_id as article_1_0_,
        article0_.created_time as created_2_0_,
        article0_.modified_time as modified3_0_,
        article0_.member_id as member_i9_0_,
        article0_.category as category4_0_,
        article0_.contents as contents5_0_,
        article0_.price as price6_0_,
        article0_.title as title7_0_,
        article0_.trade_state as trade_st8_0_ 
    from
        article article0_ 
    left outer join
        article_favorite_count articlefav1_ 
            on (
                article0_.article_id=articlefav1_.article_id
            ) 
    where
        article0_.article_id<? 
        and article0_.trade_state=? 
    order by
        article0_.article_id desc limit ?
```
---

## 더하여
CQRS는 Command 와 Query의 책임을 분리하는 것입니다. 

이 글은 왜 관심사가 다른지, 왜 분리 해야하는지에 대해서 다뤘습니다.
앞서 소프트웨어는 사용자의 요청을 **잘** 처리하고, **잘** 보여줘야된다는 말에 말을 했는데,
**잘** 보여주는 방법, 즉 빠르게 응답을 보여주는 방법에 대해선 자세히 다루지 못한것 같습니다.

조회는 데이터베이스로부터 데이터를 읽어들여 사용자의 화면에 뿌려주는 것입니다.
시점에 대해 생각해보면, 데이터베이스에서 데이터를 읽는 순간과 화면에 뿌려주는 시간은 다를 수 밖에 없고, 읽는 시점의 데이터와 뿌려주는 시점에 대한 데이터 또한 다를 확률이 존재합니다.

CQRS는 이를 인정하는 것에서 부터 시작합니다. 
사용자가 받는 데이터는 어차피 실제 데이터와 같을 수 없으니, 
조회는 인 메모리 NoSQL과 같은, 조회에 유리한 DB를 사용하여 사용자가 더 빠르게 정보를 읽을 수 있도록 하고, 변경보다 조회의 부하가 높기 때문에 높은 부하량도 잘 처리할 수 있도록 인프라를 구성합니다. 
그리고 데이터를 변경하는 CUD는 데이터 변경에 최적화된 DB를 사용하면서 둘 간의 데이터를 브로커를 통하여 동기화 하는 방식입니다.

직고래의 사용자가 늘어나게 된다면 추후 적용기로 만나볼수 있겠군요!
