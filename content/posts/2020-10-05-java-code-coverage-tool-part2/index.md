---
title: 코드 커버리지 분석 도구 적용기 - 2편, JaCoCo 적용하기
author: Junyoung Lee
date: 2020-10-05
hero: ./images/hero.jpg
slug: /java-code-coverage-tool-part2
---

안녕하세요. 우아한테크코스 2기, 셀러리 컴퍼니에서 [직고래](https://play.google.com/store/apps/details?id=com.sellerleecompany.jikgorae)를 개발하고 있는 스티치입니다.

![stitch](./images/stitch.jpg)

[코드 커버리지 분석 도구 적용기 - 1편, 코드 커버리지(Code Coverage)가 뭔가요?](https://seller-lee.github.io/java-code-coverage-tool-part1)에 이어서, 이번에는 프로젝트에 **코드 커버리지 분석 도구인 JaCoCo를 어떻게 적용했는지**에 대해 소개해드리도록 하겠습니다.

## [JaCoCo](https://www.jacoco.org/jacoco/)란?

### JaCoCo

> JaCoCo is a free code coverage library for Java, which has been created by the EclEmma team based on the lessons learned from using and integration existing libraries for many years. - [JaCoCo](https://www.jacoco.org/jacoco/)

**JaCoCo**는 **자바 코드 커버리지를 체크하는 데에 사용되는 오픈소스 라이브러리**입니다.

> JaCoCo의 버전은 [Maven Central Repository](https://search.maven.org/search?q=g:org.jacoco)를 통해 확인할 수 있습니다. 작성일(20.10.05) 기준, 최신 버전은 **0.8.6**입니다.

### JaCoCo의 특징

JaCoCo가 가지는 **특징**으로는

- **Line, Branch Coverage를 제공**한다.
- **코드 커버리지 결과**를 보기 좋도록 **파일 형태로 저장**할 수 있다.
  - html, xml, csv 등으로 Report를 생성할 수 있다.
- 설정한 **커버리지 기준을 만족하는지 확인**할 수 있다.

등이 있습니다.

이러한 특징들은 **코드 커버리지를 쉽게 확인하고 관리할 수 있도록 도와줍니다.**

## 프로젝트에 JaCoCo 적용하기

### 개발 환경

- Java 8
- Spring Boot 2.3.1
- Gradle 6.4.1

현재 직고래 프로젝트의 개발 환경은 위와 같습니다.

![structure](./images/structure.png)

저희 프로젝트 구조의 경우 **api, chat, common,** 총 3개의 모듈로 구성된 **멀티 모듈 프로젝트**입니다. 

JaCoCo를 싱글 모듈 프로젝트에 적용하는 방법과 멀티 모듈 프로젝트에 적용하는 방법은 조금 차이가 있습니다. 아쉽지만 이번 글에서는 저희 프로젝트의 구조인 **멀티 모듈 프로젝트**에 적용하는 방법을 보여드리겠습니다.

> 일반적인 싱글 모듈 프로젝트에 적용하는 방법은 우아한형제들 기술 블로그에 연철님께서 쓰신 [Gradle 프로젝트에 JaCoCo 설정하기](https://woowabros.github.io/experience/2020/02/02/jacoco-config-on-gradle-project.html) 글을 참고하시면 될 것 같습니다.

### JaCoCo 플러그인 추가

저희 루트 프로젝트의 `build.gradle` 파일은 아래와 같습니다.

```java
plugins {
    id 'java'
    id 'org.springframework.boot' version '2.3.1.RELEASE'
    id 'io.spring.dependency-management' version '1.0.9.RELEASE'
    id "org.asciidoctor.convert" version "1.5.9.2"
}

allprojects {
    group = 'com.jikgorae'
    version = '0.0.1-SNAPSHOT'
}

subprojects {
    apply plugin: 'java'
    apply plugin: 'org.springframework.boot'
    apply plugin: 'io.spring.dependency-management'
    apply plugin: 'org.asciidoctor.convert'

    sourceCompatibility = '1.8'

    repositories {
        mavenCentral()
    }
}

project(':api') {
    dependencies {
        compile project(':common')
    }
}

project(':chat') {
    dependencies {
        compile project(':common')
    }
}
```

저희는 모든 모듈의 테스트에 JaCoCo를 적용하고 싶기 때문에 **JaCoCo 플러그인**을 `subprojects` 블록에 설정값으로 추가해야 합니다.

`apply plugin`의 값으로 `'jacoco'`를 추가하면 됩니다.

```java
...

subprojects {
    apply plugin: 'java'
    apply plugin: 'org.springframework.boot'
    apply plugin: 'io.spring.dependency-management'
    apply plugin: 'org.asciidoctor.convert'
    apply plugin: 'jacoco' // 추가

    sourceCompatibility = '1.8'

    repositories {
        mavenCentral()
    }
}

...
```  

위 설정을 추가한 후, gradle 새로 고침을 실행하면 의존성이 추가되면서 서브 모듈의 `Tasks/verification`에 JaCoCo의 Task가 추가됩니다.

![jacoco added](./images/jacoco-added.png)

추가된 `jacocoTestReport`와 `jacocoTestCoverageVerification`은 **JaCoCo 플러그인**의 Task입니다. 각 Task의 역할을 간단하게 살펴보면

- `jacocoTestReport` : 바이너리 커버리지 결과를 사람이 **읽기 좋은 형태의 리포트로 저장**해주는 Task이다.
- `jacocoTestCoverageVerification` : **원하는 커버리지 기준을 만족하는지 확인**해 주는 Task이다.

정도로 볼 수 있습니다. 추가적인 내용은 각 Task에 대한 설정을 진행하면서 소개하도록 하겠습니다.

### JaCoCo 플러그인 설정하기

위의 두 가지 Task에 대한 설정을 진행하기 전에, [JaCoCo 플러그인 설정](https://docs.gradle.org/current/dsl/org.gradle.testing.jacoco.plugins.JacocoPluginExtension.html)을 먼저 해주어야 합니다.

`jacoco`라는 이름을 가지는 `JaCoCoPluginExtension` 타입의 **project extension**을 통해 추가적인 설정을 해줄 수 있으며, 설정해줄 수 있는 속성으로는 `reportsDir`과 `toolVersion`이 있습니다.

- `reportsDir` : 사용할 JaCoCo의 JAR 버전
- `toolVersion` : Report가 생성될 디렉토리 경로

저희는 여기서 `toolVersion`만 설정하고 넘어가도록 하겠습니다. `toolVersion`은 작성일(20.10.05)을 기준으로 가장 최신 버전인 **0.8.6**로 설정하겠습니다.

> `reportsDir`을 설정하지 않을 경우, `${project.reporting.baseDir}/jacoco` 가 기본 경로입니다.

```java
...

subprojects {
    apply plugin: 'java'
    apply plugin: 'org.springframework.boot'
    apply plugin: 'io.spring.dependency-management'
    apply plugin: 'org.asciidoctor.convert'
    apply plugin: 'jacoco'

    sourceCompatibility = '1.8'

    repositories {
        mavenCentral()
    }

    jacoco {
        toolVersion = '0.8.6' // 작성일(20.10.05) 기준
        // reportsDir = ${project.reporting.baseDir}/jacoco
    }
}

...
```

### `jacocoTestReports` 설정하기

이번에는 테스트 결과를 리포트 파일로 저장하는 `jacocoTestReports` Task의 [설정](https://docs.gradle.org/current/dsl/org.gradle.testing.jacoco.tasks.JacocoReport.html#org.gradle.testing.jacoco.tasks.JacocoReport:reports)을 해야 합니다.

`jacocoTestReports` Task는 테스트 결과를 html, csv, xml 형태로 저장해줍니다. html의 경우 **사용자가 읽기 편한 파일 형식**이고, csv나 xml의 경우 추후 연동할 **소나큐브(*SonarQube*) 등에서 사용되는 파일 형식**입니다.

**테스트 결과를 받을 파일 형식**은 `jacocoTestReport`의 `reports` 메서드를 통해 설정해 줄 수 있습니다.

```java
reports {
    html {
        enabled false
    }
    csv {
        enabled true
    }
}
```

추가적으로 **파일 형식에 따라 저장하는 경로를 다르게** 할 수 있는 방법도 있는데 설정 방법은 아래와 같습니다.

```java
reports {
    html {
        enable true
        destination file('build/reports/myReport.html')
    }
}
``` 

> `destination`은 `File` 타입의 값만 받기 때문에 `file('저장할 디렉토리 경로')`과 같은 형식으로 작성해야 합니다. 

```java
reports {
    html.enabled false
    html.destination file('build/reports/myReport.html')
    csv.enabled true
}
```

또는 위의 예제와 같이 좀 더 간단한 방법으로도 설정이 가능합니다.

저희 프로젝트에서는 팀원이 테스트 결과를 보기 쉽고 추후 소나큐브에서 사용할 수 있게 **html과 csv**, 두 가지 파일 형식을 설정하도록 하겠습니다.

```java
subprojects {
    apply plugin: 'java'
    apply plugin: 'org.springframework.boot'
    apply plugin: 'io.spring.dependency-management'
    apply plugin: 'org.asciidoctor.convert'
    apply plugin: 'jacoco'

    sourceCompatibility = '1.8'

    repositories {
        mavenCentral()
    }

    jacoco {
        toolVersion = '0.8.6'
    }

    jacocoTestReport {
        reports {
            html.enabled true // html 설정
            csv.enabled true // csv 설정
            xml.enabled false // xml 미설정
        }
    }
}
```

### `jacocoTestCoverageVerification` 설정하기

이번에는 **원하는 코드 커버리지를 설정하고, 커버리지를 만족하는지 여부를 확인**할 수 있는 `jacocoTestCoverageVerification` Task의 [설정](https://docs.gradle.org/current/dsl/org.gradle.testing.jacoco.tasks.JacocoCoverageVerification.html)을 살펴보겠습니다.

`jacocoTestCoverageVerification` Task는 **최소 코드 커버리지 수준을 설정**할 수 있고, 이를 통과하지 못할 경우 Task가 **실패**하게 됩니다.

`jacocoTestCoverageVerification`의 `violationRules` 메서드를 통해 **커버리지 기준을 설정하는 룰을 정의**할 수 있고, 각각의 룰에 대한 설정은 `violationRules` 메서드에 전달할 `rule` 메서드를 통해 정의할 수 있습니다.

depth가 깊다 보니 설명만으로는 이해하기 힘든 것 같습니다. 실제 코드를 통해 `rule` 메서드에 적용할 수 있는 값들이 어떤 것이 있는지 알아보도록 하겠습니다.

```java
jacocoTestCoverageVerification {
    violationRules {
        rule {
            enable = true
            element = 'CLASS'
            // includes = []

            limit {
                counter = 'BRANCH'
                value = 'COVEREDRATIO'
                minimum = 0.90
            }

            limit {
                counter = 'LINE'
                value = 'COVEREDRATIO'
                minimum = 0.80
            }

            limit {
                counter = 'LINE'
                value = 'TOTALCOUNT'
                maximum = 200
            }

            // excludes = []
        }
        
        // 여러 rule을 생성할 수 있습니다.
        rule {
            ... 
        }
    }
}
```

#### `enable`

해당하는 rule의 **활성화 여부**를 boolean으로 나타냅니다. 값을 지정하지 않는 경우 Default 값은 **true**입니다.

#### [`element`](https://www.eclemma.org/jacoco/trunk/doc/api/org/jacoco/core/analysis/ICoverageNode.ElementType.html)

**커버리지를 체크할 기준(단위)**을 정할 수 있으며, 총 6개의 기준이 존재합니다.

- BUNDLE : 패키지 번들(프로젝트 모든 파일을 합친 것)
- CLASS : 클래스
- GROUP : 논리적 번들 그룹
- METHOD : 메서드
- PACKAGE : 패키지
- SOURCEFILE : 소스 파일

값을 지정하지 않는 경우 Default 값은 **`BUNDLE`**입니다.

#### `includes`

해당하는 `rule`을 **적용 대상**을 package 수준으로 정의할 수 있습니다. 값을 지정하지 않는 경우 Default 값은 **전체 package** 입니다.

#### [`counter`](https://www.eclemma.org/jacoco/trunk/doc/api/org/jacoco/core/analysis/ICoverageNode.CounterEntity.html)

`counter`는 `limit` 메서드를 통해 지정할 수 있으며 **커버리지 측정의 최소 단위**를 말합니다. 이때 측정은 java byte code가 실행된 것을 기준으로 측정되고, 총 6개의 단위가 존재합니다.

- BRANCH : 조건문 등의 분기 수
- CLASS : 클래스 수, 내부 메서드가 한 번이라도 실행된다면 실행된 것으로 간주한다.
- COMPLEXITY : [복잡도](https://www.eclemma.org/jacoco/trunk/doc/counters.html)
- INSTRUCTION : Java 바이트코드 명령 수
- METHOD : 메서드 수, 메서드가 한 번이라도 실행된다면 실행된 것으로 간주한다.
- LINE : 빈 줄을 제외한 실제 코드의 라인 수, 라인이 한 번이라도 실행되면 실행된 것으로 간주한다.

값을 지정하지 않는 경우 Default 값은 **`INSTRUCTION`**입니다.

#### [`value`](https://www.eclemma.org/jacoco/trunk/doc/api/org/jacoco/core/analysis/ICounter.CounterValue.html)

`value`는 `limit` 메서드를 통해 지정할 수 있으며 **측정한 커버리지를 어떠한 방식으로 보여줄 것**인지를 말합니다. 총 5개의 방식이 존재합니다.

- COVEREDCOUNT : 커버된 개수
- COVEREDRATIO : 커버된 비율, 0부터 1사이의 숫자로 1이 100%이다.
- MISSEDCOUNT : 커버되지 않은 개수
- MISSEDRATIO : 커버되지 않은 비율, 0부터 1사이의 숫자로 1이 100%이다.
- TOTALCOUNT : 전체 개수

값을 지정하지 않은 경우 Default 값은 **`COVEREDRATIO`**입니다.

#### `minimum`

`minimum`은 `limit` 메서드를 통해 지정할 수 있으며 `counter` 값을 `value`에 맞게 표현했을 때 **최솟값**을 말합니다. 이 값을 통해 `jacocoTestCoverageVerification`의 **성공 여부가 결정**됩니다.

해당 값은 `BigDecimal` 타입이고 **표기한 자릿수만큼 `value`가 출력**됩니다. 만약 커버리지를 80%를 원했는데 0.80이 아니라 0.8을 입력하면 커버리지가 0.87이라도 0.8로 표시됩니다.

`minimum`은 Default 값이 존재하지 않습니다.

#### `excludes`

커버리지를 측정할 때 **제외할 클래스**를 지정할 수 있습니다. 패키지 레벨의 경로로 지정하여야 하고 경로에는 `*`와 `?`를 사용할 수 있습니다.

지금까지 `rule` 메서드에 적용할 수 있는 **설정값**들에 대해 알아보았습니다. 학습한 내용을 바탕으로 저희 프로젝트의 `jacocoTestCoverageVerification` Task를 설정해보겠습니다.

```java
subprojects {
    apply plugin: 'java'
    apply plugin: 'org.springframework.boot'
    apply plugin: 'io.spring.dependency-management'
    apply plugin: 'org.asciidoctor.convert'
    apply plugin: 'jacoco'

    sourceCompatibility = '1.8'

    repositories {
        mavenCentral()
    }

    jacoco {
        toolVersion = '0.8.6'
    }

    jacocoTestReport {
        reports {
            html.enabled true
            csv.enabled true
            xml.enabled false
        }
    }

    jacocoTestCoverageVerification {
        violationRules {
            rule {
                enabled = true // 활성화
                element = 'CLASS' // 클래스 단위로 커버리지 체크
                // includes = []                

                // 라인 커버리지 제한을 80%로 설정
                limit {
                    counter = 'LINE'
                    value = 'COVEREDRATIO'
                    minimum = 0.80
                }

                // 브랜치 커버리지 제한을 80%로 설정
                limit {
                    counter = 'BRANCH'
                    value = 'COVEREDRATIO'
                    minimum = 0.80
                }

                excludes = []
            }
        }
    }
}
```

