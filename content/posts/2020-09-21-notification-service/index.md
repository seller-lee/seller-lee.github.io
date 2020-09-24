---
title: 알림 서비스 적용기
author: Yoonseo Nam
date: 2020-09-21
hero: ./images/notification-service.jpg
slug: /notification-service
---

## 들어가며

안녕하세요. 셀러리컴퍼니의 팀장 터틀입니다.

직고래 2.0.0버전 부터 알림 기능이 추가되었는데요, 이번 글에선 알림 기능을 어떤 식으로 구현했고 어떤 과정으로 리팩터링 했는지 다뤄보도록 하겠습니다.



## 적용 사례

알림을 가장 먼저 적용한 곳은 찜 기능입니다. 누군가 나의 게시글을 찜한 경우 나에게 푸시알림을 보내주는 과정으로 진행되어야 합니다. 아래는 해당 기능의 코드입니다.

```java
@Service
public class FavoriteService {
		// 필드, 생성자 생략

		@Transactional
		public Long create(FavoriteRequest request, Member loginMember) {
				// 찜 로직
				Favorite favorite = new Favorite(new Article(request.getArticleId()), loginMember);
				Favorite saved = favoriteRepository.save(favorite);

				// 알림 로직
				Article article = articleViewService.show(request.getArticleId());
				NotificationHandler handler = new NotificationHandler();
				handler.send(
						article.getAuthor().getPushToken(),
						loginMember.getNickname(),
				);

				return saved.getId();
		}
}
```

Favorite 객체를 생성한 후 저장합니다.

그 다음 찜 대상이 되는 게시물을 통해 글쓴이의 PushToken을 알아냅니다.

마지막으로 NotificationHandler의 `send()`를 통해 알림이 전송됩니다.

```java
public class NotificationHandler {
		public void send(String pushToken, String sender) {
				// 메시지를 만들고 알림을 전송하는 로직
		}
}
```



## 불편했던 점

기능은 동작했지만, 두 가지의 불편한 점이 있어서 리팩터링이 필요하다고 느꼈습니다.

1. Application layer(FavoriteService)에 알림 전송 로직 노출
2. 단일 트랜잭션

### Application layer에 로직 노출

응용계층에 있는 서비스의 역할 중 하나는 도메인 객체들의 실행 흐름을 제어하는 것입니다. 단순한 흐름제어에서 벗어나 로직을 갖는 것은 도메인 객체의 응집력을 떨어뜨리고 결합도를 높이거나 코드를 재사용하게 만드는 원인이 됩니다.

도메인 객체는 본인이 할 수 있는 로직(행위)을 갖고, 본인이 수행해야 합니다. 이것이 응집력입니다. 그렇지 않고 도메인 객체의 역할을 Service에서 해버린다면 해당 기능이 여러 Service에서 사용될 경우 해당 기능에 대한 코드가 재사용됩니다.

앞선 코드에서 `찜을 한 경우 알림을 보낸다`라는 요구사항으로 인해 FavoriteService에 알림을 보내는 로직이 있었습니다.  `댓글을 단 경우 알림을 보낸다`라는 요구사항이 추가되었을 경우 CommentService같은 곳에 중복된 코드가 발생한다는 것이죠.

`send()`라는 메소드로 알림을 보내는 행위 자체는 NotificationHandler 객체가 갖도록 했지만 **알림을 전송한다**는 **부가적인 로직이** 알림이 필요한 Service 객체마다 추가되는 것이 불편했습니다.

### 단일 트랜잭션

다음은 트랜잭션 문제입니다. 게시글에 대한 찜은 정상적으로 동작했지만 알림이 실패한 경우 찜까지 롤백되는 것은 기대했던 동작이 아니였습니다.

게시글을 찜하는 사용자에게는 `찜이 되는지 안되는지`가 중요하고 글쓴이에게 알림이 가는지 안 가는지는 크게 중요하지 않습니다. 따라서 찜을 하는 로직과 알림이 보내지는 로직은 서로 다른 트랜잭션에서 진행되어야 했습니다. 



## 그렇다면 이벤트로 처리하는 것이 적절한가?

처음 이벤트로 구현하는 것을 생각했을 땐 `기능에 비해 과한 구현이 아닌가?` 라고 생각이 들었습니다. 마치 이벤트로 해야 하는 로직이 정해져 있는 것 처럼 생각해서 제가 구현하려는 Context가 적절한 예인지 고민했습니다.

하지만 찾아볼 수록 생각보다 큰 범위에 이벤트를 적용할 수 있었습니다. 이벤트라는 것은 단순히 디자인 패턴 중 하나인 [옵저버패턴](https://en.wikipedia.org/wiki/Observer_pattern)인 것이죠. 

이벤트(옵저버 패턴)의 가장 큰 장점은 결합도가 줄어든다는 것입니다. 결합도가 줄어듬으로써 부가적인 장점이 생깁니다.

- 객체간의 결합도를 줄인다.
    - 변경에 유연성이 생긴다.
    - 객체의 재사용성을 높여준다.
    - 테스트하기 편하다.
    - 단일 책임 원칙(SRP)을 더 잘 지키도록 해준다.

하지만 결합도가 줄어든다는 것이 항상 장점으로 적용되는 것은 아닙니다.

- 직접적인 결합이 없기 때문에 로직의 흐름을 파악하기 쉽지 않다.

로직이 한 곳에 있을 때와 달리, 이벤트를 발행하는 곳과 구독하는 곳을 봐야하는데, 이벤트가 많을 경우 상대적으로  로직이 한 곳에 있을 때 보다 흐름을 파악하기가 어렵습니다.

하지만 알림과 찜 사이에 의존이 있을 필요가 없고 부가적인 장점이 더 크다고 생각해서 이벤트를 적용하기로 했습니다.



## ApplicationEventPublisher

가장 먼저 [ApplicationEventPublisher](https://docs.spring.io/spring/docs/current/spring-framework-reference/core.html#context-functionality-events)를 사용했습니다. 공식 문서에 나와 있듯이, ApplicationEventPublisher는 옵저버 패턴의 구현체로 ApplicationContext가 상속받고 있는 인터페이스입니다. 따라서 Service 객체에서 별도의 주입 없이 의존성을 주입받을 수 있습니다.

ApplicationEventPublisher를 사용해 다음과 같이 리팩터링 했습니다.

```java
@Service
public class FavoriteService {
		private final ApplicationEventPublisher eventPublisher;
		// 나머지 필드, 생성자 생략

		@Transactional
		public Long create(FavoriteRequest request, Member loginMember) {
				// 찜 로직
				Favorite favorite = new Favorite(new Article(request.getArticleId()), loginMember);
				Favorite saved = favoriteRepository.save(favorite);

				// 이벤트 발생 로직
				Article article = articleViewService.show(request.getArticleId());
				eventPublisher.publishEvent(new FavoriteCreatedEvent(favorite));

				return saved.getId();
		}
}
```

코드를 얼핏 보면 별로 개선된 것이 없는데? 라고 생각하실 수도 있습니다. 하지만 지금은 부가적인 기능이 하나라서 그렇습니다. 현재는 다음과 같이 찜을 한 경우 알림만 발송하면 되죠.

```java
@Service
public class FavoriteService {
		@Transactional
		public Long create(FavoriteRequest request, Member loginMember) {
				// 찜 로직
				// 알림 로직
}
```

하지만 요구사항이 추가되어 알림도 보내고, 메일도 보내고, 슬랙을 통해 알림도 보내줘야 한다면 어떨까요?

```java
@Service
public class FavoriteService {
		@Transactional
		public Long create(FavoriteRequest request, Member loginMember) {
				// 찜 로직
				// 알림 로직
				// 메일 로직
				// 슬랙 로직
}
```

`create()`가 하는 일이 점점 늘어나고 규모도 커지게 됩니다. 반면 이벤트를 사용한 경우엔 요구사항이 추가되어도 다음과 같습니다.

```java
@Service
public class FavoriteService {
		@Transactional
		public Long create(FavoriteRequest request, Member loginMember) {
				// 찜 로직
				// 이벤트 발생 로직
		}
}

```

이벤트를 구독하는 부분만 추가하면 되기 때문에 create는 간결하게 `찜을 생성하는 흐름을 제어한다`는 Application layer의 역할만을 수행할 수 있게 됩니다.

### 이벤트 객체

이벤트 객체는 Spring 4.2 이전까지는 ApplicationEvent를 상속받아야 했지만 Spring 4.2부터는 순수한 자바 객체(POJO)를 이벤트 객체로 사용할 수 있습니다.

스프링과 관련된 코드가 없는 POJO를 사용함으로써 단위테스트를 할 때 좀 더 편하고, 유지보수를 하기 더 쉬워진다는 장점이 있습니다.

따라서 이벤트 객체의 코드는 다음과 같습니다.

```java
public class FavoriteCreatedEvent {
    private final Favorite favorite;
		// ... 메소드 생략
}
```

### 이벤트 처리

이벤트 처리도 Spring 4.2 이전까지는 ApplicationListener를 상속받아야 했지만 Spring 4.2부터는 `@EventListener` 애노테이션 기반으로 이벤트를 처리할 수 있습니다. 애노테이션만 달아주면 인자로 이벤트를 받아서 처리할 수 있는 것이죠.

다만 애노테이션 기반으로 동작하기 때문에 빈으로 등록되어 있어야 합니다. 코드는 다음과 같습니다.

```java
@Component
public class FavoriteCreatedListener {
    @EventListener
    public void sendNotification(FavoriteCreatedEvent event) {
				// 이벤트를 처리(이벤트 객체를 가공해 알림을 전송)
    }
}
```

여기까지가 ApplicationEventPublisher를 사용한 구현입니다.



## @TransactionalEventListener

이벤트로 구현함으로써 `Application layer에 로직 노출` 이라는 불편한 점은 어느정도 해소되었습니다. 하지만 `단일 트랜잭션`이라는 불편한 점은 아직 남아있었습니다.

이것은 [TransactionalEventListener](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/event/TransactionalEventListener.html)를 통해서 해결이 가능했습니다. TransactionalEventListener 역시 Spring 4.2부터 사용할 수 있으며 공식문서를 보면 다음과 같이 나와있습니다.

> An EventListener that is invoked according to a TransactionPhase.

즉, TransactionalEventListener는 [TransactionPhase](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/event/TransactionPhase.html)에 따라 호출되는 이벤트 리스너입니다. TransactionPhase는 쉽게 말해 트랜잭션 이벤트를 적용하는 시점입니다. Enum 클래스이며 다음과 같은 필드를 갖고있습니다.

- BEFORE_COMMIT
- AFTER_COMMIT
- AFTER_ROLLBACK
- AFTER_COMPLETION

전 찜이 생성된 이후 알림을 보내면 되니 AFTER_COMMIT을 적용하면 됐습니다. 마침 default가 AFTER_COMMIT이라서 애노테이션만 지정해줬습니다. 

이로인해 최초의 NotificationHandler는 다음과 같이 변경됐습니다.

```java
@Component
public class FavoriteCreatedListener {
    @TransactionalEventListener
    public void sendNotification(FavoriteCreatedEvent event) {
				// 이벤트를 처리(이벤트 객체를 가공해 알림을 전송)
    }
}
```



## @DomainEvents와 AbstractAggregateRoot

추가로 `@DomainEvents`와 AbstractAggregateRoot로도 엔티티에서 이벤트를 구현할 수도 있습니다. `@DomainEvents`와 AbstractAggregateRoot는 Spring Data 프로젝트에 있는 기능으로 Repository의 save메소드를 통해 저장할 때마다 자동으로 호출되는 이벤트입니다.

### 이건 왜 존재하나?

엔티티에서 ApplicationEventPublisher 필드를 갖고 이벤트를 발생시킬 수도 있지만, 아쉽게도 **동작하지 않습니다.**

일반적으로 빈은 스프링 IoC 컨테이너가 초기화될 때 생성됩니다. 하지만 엔티티의 경우 Spring Data에서 리플렉션 API를 통해 생성하기 때문에 필드로 갖고있는 ApplicationEventPublisher가 초기화되지 않습니다.

쉽게 말해, 생성 시점이 달라서 ApplicationEventPublisher을 사용할 수 없습니다. 이것을 피하려면 항상 트랜잭션 내에서 메소드를 실행해야합니다. 요구사항은 언제 변경될 지 모르기 때문에 이러한 제약은 불편하게 느껴집니다.

그렇기 때문에 Spring Data 프로젝트에서 기능을 제공하는 것입니다.

`@DomainEvents`와 AbstractAggregateRoot를 사용한다면 도메인 로직이 Application layer에 노출되지 않고 더욱 응집도가 높은 구현이 가능합니다.

### 이벤트 객체

도메인 이벤트의 경우 POJO를 이벤트 객체로 사용하진 못합니다. 대신 ApplicationEvent 클래스를 상속받아서 구현합니다.

```java
public class FavoriteCreatedEvent extends ApplicationEvent {
		private final Favorite favorite;

    public FavoriteCreatedEvent(Object source) {
        super(source);
        favorite = (Favorite)source;
    }
}
```

### 이벤트 처리

이벤트 처리의 경우도 애노테이션이 아닌 ApplicationListener 인터페이스를 상속받아서 구현합니다.

```java
@Component
public class FavoriteCreatedListener implements ApplicationListener<FavoriteCreatedEvent> {
		@Override
    public void onApplicationEvent(FavoriteCreatedEvent event) {
				// 이벤트를 처리(이벤트 객체를 가공해 알림을 전송)
		}
}
```

이벤트 객체와 이벤트 처리 모두 상속받아서 구현하는 번거로움이 생겼습니다. 하지만 서비스에 있던 이벤트를 발생시키는 로직이 도메인 객체 안으로 이동했습니다.

먼저 ApplicationEventPublisher를 사용할 때의 FavoriteService입니다.

```java
@Service
public class FavoriteService {
		private final ApplicationEventPublisher eventPublisher;
		// 나머지 필드, 생성자 생략

		@Transactional
		public Long create(FavoriteRequest request, Member loginMember) {
				// 찜 로직
				Favorite favorite = new Favorite(new Article(request.getArticleId()), loginMember);
				Favorite saved = favoriteRepository.save(favorite);

				// 이벤트 발생 로직
				Article article = articleViewService.show(request.getArticleId());
				eventPublisher.publishEvent(new FavoriteCreatedEvent(favorite));

				return saved.getId();
		}
}
```

다음은 도메인 이벤트를 사용할 때의 FavoriteService입니다.

```java
@Service
public class FavoriteService {
		// 나머지 필드, 생성자 생략

		@Transactional
		public Long create(FavoriteRequest request, Member loginMember) {
				// 찜 로직
				Favorite favorite = new Favorite(new Article(request.getArticleId()), loginMember);
				Favorite saved = favoriteRepository.save(favorite.create());
				return saved.getId();
		}
}
```

이벤트를 발생시키는 로직 마저 Favorite 객체의 `create()`메소드로 이동했습니다.

```java
public class Favorite extends AbstractAggregateRoot<Favorite> {
		// 필드, 메소드 생략

		public Favorite create() {
        this.registerEvent(new FavoriteCreatedEvent(this));
        return this;
    }
}
```

이로 인해 FavoriteService는 흐름만을 제어하도록 변경되었고, Favorite을 생성할때 발생하는 이벤트도 Favorite 객체 내에서 관리합니다.



## 정리

ApplicationEventPublisher를 사용할 경우 POJO로 이벤트 객체를 사용하고 애노테이션을 통해 간편하게 이벤트 처리가 가능했습니다. 하지만 Application layer에 로직이 생겨 도메인의 응집력이 떨어진다는 단점이 있었습니다.

반면 도메인 이벤트를 사용할 경우 도메인은 AbstractAggregateRoot를 상속받고, 이벤트 객체는 ApplicationEvent, 이벤트 처리는 ApplicationListener를 상속받는다는 번거로움이 있었지만 도메인의 응집력이 더 높아진다는 장점이 있었습니다.

정답은 없습니다. 요구사항과 주어진 환경에 맞게 적절한 방법을 사용하는 것이 베스트라고 생각합니다.



## 출처

- [https://www.baeldung.com/spring-events](https://www.baeldung.com/spring-events)
- [https://www.baeldung.com/spring-data-ddd](https://www.baeldung.com/spring-data-ddd)
- [https://dzone.com/articles/transaction-synchronization-and-spring-application](https://dzone.com/articles/transaction-synchronization-and-spring-application)
- [https://supawer0728.github.io/2018/03/24/spring-event/](https://supawer0728.github.io/2018/03/24/spring-event/)