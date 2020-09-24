---
title: 리팩토링 일기 - REST API
author: Gyeongjun Kim
date: 2020-09-01
hero: ./images/hero.png
slug: /rest-api
---

안녕하세요. 셀러리 컴퍼니에서 [직고래](https://play.google.com/store/apps/details?id=com.sellerleecompany.jikgorae)를 개발하고 있는 코즈입니다.

### Why REST?

REST하지 못한 API를 마주할때가 있습니다.

_"URI에 행동을 담으면 안돼!"
"왜?"
"어.. 그건 REST하지 않으니까..."_

API를 만들면서, 처음으로 마주하게 되는 고민은 어떤 HTTP method를 사용할지, 그리고 어떤 URI에 Mapping을 할지 입니다.
그리고, 그런 고민들을 해결해주는 것은 _'RESTful하려면,,'_ 입니다.

물론 원래의 REST는, Roy Fielding이 말하는 REST는 그런 뜻은 아니었지만요. 
- _[그런 REST API로 괜찮은가](https://youtu.be/RP_f5dMoHFc)_
- _[바쁜 개발자들을 위한 REST 논문 요약](https://blog.npcode.com/2017/03/02/%EB%B0%94%EC%81%9C-%EA%B0%9C%EB%B0%9C%EC%9E%90%EB%93%A4%EC%9D%84-%EC%9C%84%ED%95%9C-rest-%EB%85%BC%EB%AC%B8-%EC%9A%94%EC%95%BD/)_

그런 REST API를 사용하고 있는 저에게 REST는, 팀의 혼란을 줄여주는 방법 정도로 다가옵니다.
다른 팀원이 개발한 API를 사용하는 상황에서 URI와 method가 제 각각이면 혼란스러우니까요.
정답이 없는 상황에서 'REST스럽게' 를 정답으로 정한다면, 팀원간의 불필요한 논쟁도 줄어들 것이고, 생산적인 개발을 할 수 있지 않을까요?

_"이런 API인데 요청을 어떻게 날려야하지?"
"조회니까 GET으로 `/articles`에 카테고리 param으로 날리삼 그게 제일 RESTful"
"ㅇㅇ"_

물론 `login`, `logout` 같은건 팀원들과의 상의하에 REST 하지 않게 구성하는게 더 나을수도 있다고 생각합니다.

---

### 이전 코드
```java
@RequestMapping(ARTICLE_URI)
public class ArticleController {
    public static final String ARTICLE_URI = "/articles";

    ...
    
    @GetMapping("/trade-state")
    public ResponseEntity<List<ArticleCardResponse>> showByTradeState(
            @RequestParam String tradeState, @LoginMember Member loginMember) {
        List<ArticleCardResponse> responses = articleViewService.showByTradeState(loginMember, tradeState);
        return ResponseEntity.ok(responses);
    }
```
요구 사항은 request로 주어진 trade-state에 맞는 article의 전체 조회입니다. trade-state는 article에 담겨있는 정보입니다.
현재 요청은 header에 로그인을 위한 token과 함께 `/articles/trade-state?tradeState={tradeState}` 로 날라가고 있습니다.

만약, `GET /articles/1/trade-state` 이라면, id가 1인 article의 trade-state 조회 정도로 해석할 수 있겠습니다.

`GET /articles/trade-state?tradeState={tradeState}` 를 해석해보면, article의 모든 trade-state중 tradeState가 ~ 인 trade-state 조회 요청 정도로 해석이 되네요.

---

### 바뀐 코드
```java
@RequestMapping(ARTICLE_URI)
public class ArticleController {
    public static final String ARTICLE_URI = "/articles";

    ...
    
    @GetMapping(params = "tradeState")
    public ResponseEntity<List<ArticleCardResponse>> showByTradeState(
            @RequestParam String tradeState, @LoginMember Member loginMember) {
        List<ArticleCardResponse> responses = articleViewService.showByTradeState(loginMember, tradeState);
        return ResponseEntity.ok(responses);
    }
```
생각해보면 이 코드가 나온 배경은 이미 `/articles`에 GET 메소드가 매핑 되어있기 때문이었을지도 모르겠습니다. 
param이 달라도 URI와 method가 동일한 mapping이 2개 이상 존재할땐 Ambiguous mapping으로 bean 생성에 실패하게 됩니다.
하나의 요청을 받을땐 명시하지 않아도 괜찮지만, 그렇지 않은 상황에선 `@GetMapping` 어노테이션에 params를 사용하여, URI와 method는 동일하고 params만 다른 요청을 처리할 수 있습니다.

