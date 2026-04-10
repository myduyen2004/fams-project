package com.fams.backend.config;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Jackson Mix-in for PageImpl to support proper deserialization from Redis JSON.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public abstract class RedisPageMixIn {
    @JsonCreator
    public RedisPageMixIn(
            @JsonProperty("content") List<?> content,
            @JsonProperty("number") int number,
            @JsonProperty("size") int size,
            @JsonProperty("totalElements") long totalElements) {
    }

    @JsonProperty("pageable")
    public abstract Pageable getPageable();

    @JsonProperty("last")
    public abstract boolean isLast();

    @JsonProperty("totalPages")
    public abstract int getTotalPages();

    @JsonProperty("first")
    public abstract boolean isFirst();

    @JsonProperty("numberOfElements")
    public abstract int getNumberOfElements();
}
